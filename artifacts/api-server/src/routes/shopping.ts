import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetShoppingListResponse,
  ToggleShoppingItemBody,
  ToggleShoppingItemResponse,
} from "@workspace/api-zod";
import { db, shoppingListsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/shopping-list", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const date = (req.query.date as string) || todayDate();

  const [list] = await db
    .select()
    .from(shoppingListsTable)
    .where(
      and(
        eq(shoppingListsTable.userId, req.user.id),
        eq(shoppingListsTable.date, date),
      ),
    );

  if (!list) {
    res.json(
      GetShoppingListResponse.parse({
        items: [],
        date,
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
      date: list.date,
      id: list.id,
    }),
  );
});

router.post("/shopping-list/check", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = ToggleShoppingItemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { itemName, checked } = parsed.data;
  const dateStr = typeof parsed.data.date === "string"
    ? parsed.data.date
    : (parsed.data.date as unknown as Date).toISOString().split("T")[0];

  const [list] = await db
    .select()
    .from(shoppingListsTable)
    .where(
      and(
        eq(shoppingListsTable.userId, req.user.id),
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
      date: list.date,
      id: list.id,
    }),
  );
});

export default router;
