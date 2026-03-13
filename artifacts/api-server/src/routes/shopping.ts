import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetShoppingListQueryParams,
  GetShoppingListResponse,
  ToggleShoppingItemBody,
  ToggleShoppingItemResponse,
  UpsertShoppingListBody,
  UpsertShoppingListResponse,
} from "@workspace/api-zod";
import { db, shoppingListsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { coerceDateFields } from "../lib/parseDate";

const router: IRouter = Router();

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/shopping-list", async (req: Request, res: Response) => {
  const queryParsed = GetShoppingListQueryParams.safeParse(
    coerceDateFields({ ...req.query }, "date"),
  );
  const date = queryParsed.success && queryParsed.data.date
    ? queryParsed.data.date.toISOString().split("T")[0]
    : todayDate();

  const [list] = await db
    .select()
    .from(shoppingListsTable)
    .where(
      and(
        eq(shoppingListsTable.userId, req.user!.id),
        eq(shoppingListsTable.date, date),
      ),
    );

  if (!list) {
    res.json(
      GetShoppingListResponse.parse({
        items: [],
        date: new Date(date),
        id: null,
      }),
    );
    return;
  }

  const items = (list.itemsJson as Array<Record<string, unknown>>).map(
    (item) => ({
      ...item,
      checked: (list.checkedItems ?? []).includes(item.name as string),
    }),
  );

  res.json(
    GetShoppingListResponse.parse({
      items,
      date: new Date(list.date),
      id: list.id,
    }),
  );
});

router.put("/shopping-list", async (req: Request, res: Response) => {
  const parsed = UpsertShoppingListBody.safeParse(
    coerceDateFields({ ...req.body }, "date"),
  );
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const dateStr = parsed.data.date.toISOString().split("T")[0];

  const [list] = await db
    .insert(shoppingListsTable)
    .values({
      userId: req.user!.id,
      date: dateStr,
      itemsJson: parsed.data.items,
      checkedItems: [],
    })
    .onConflictDoUpdate({
      target: [shoppingListsTable.userId, shoppingListsTable.date],
      set: {
        itemsJson: parsed.data.items,
        updatedAt: new Date(),
      },
    })
    .returning();

  const items = (list.itemsJson as Array<Record<string, unknown>>).map(
    (item) => ({
      ...item,
      checked: (list.checkedItems ?? []).includes(item.name as string),
    }),
  );

  res.json(
    UpsertShoppingListResponse.parse({
      items,
      date: new Date(list.date),
      id: list.id,
    }),
  );
});

router.patch("/shopping-list/check", async (req: Request, res: Response) => {
  const parsed = ToggleShoppingItemBody.safeParse(
    coerceDateFields({ ...req.body }, "date"),
  );
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { itemName, checked } = parsed.data;
  const dateStr = parsed.data.date.toISOString().split("T")[0];

  const [list] = await db
    .select()
    .from(shoppingListsTable)
    .where(
      and(
        eq(shoppingListsTable.userId, req.user!.id),
        eq(shoppingListsTable.date, dateStr),
      ),
    );

  if (!list) {
    res.status(404).json({ error: "Shopping list not found for that date" });
    return;
  }

  let checkedItems = list.checkedItems ?? [];
  if (checked && !checkedItems.includes(itemName)) {
    checkedItems = [...checkedItems, itemName];
  } else if (!checked) {
    checkedItems = checkedItems.filter((i) => i !== itemName);
  }

  await db
    .update(shoppingListsTable)
    .set({ checkedItems })
    .where(eq(shoppingListsTable.id, list.id));

  const items = (list.itemsJson as Array<Record<string, unknown>>).map(
    (item) => ({
      ...item,
      checked: checkedItems.includes(item.name as string),
    }),
  );

  res.json(
    ToggleShoppingItemResponse.parse({
      items,
      date: new Date(list.date),
      id: list.id,
    }),
  );
});

export default router;
