import { Router, type IRouter, type Request, type Response } from "express";
import {
  GetShoppingListQueryParams,
  GetShoppingListResponse,
  ToggleShoppingItemBody,
  ToggleShoppingItemResponse,
  UpsertShoppingListBody,
  UpsertShoppingListResponse,
  GetNearbyStoresQueryParams,
  GetNearbyStoresResponse,
} from "@workspace/api-zod";
import { db, shoppingListsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { coerceDateFields } from "../lib/parseDate";
import { findNearbyStores } from "../services/storeFinder";

const router: IRouter = Router();

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

router.get("/shopping-list", async (req: Request, res: Response) => {
  let date: string;
  if (req.query.date) {
    const queryParsed = GetShoppingListQueryParams.safeParse(
      coerceDateFields({ ...req.query }, "date"),
    );
    if (!queryParsed.success) {
      res.status(400).json({ error: "Invalid date parameter" });
      return;
    }
    date = queryParsed.data.date!.toISOString().split("T")[0];
  } else {
    date = todayDate();
  }

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

router.get("/shopping-list/stores", async (req: Request, res: Response) => {
  const parsed = GetNearbyStoresQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "lat and lng query parameters are required" });
    return;
  }

  const { lat, lng, radius } = parsed.data;

  let stores;
  try {
    stores = await findNearbyStores(lat, lng, radius);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown store finder error";
    if (message.includes("GOOGLE_PLACES_API_KEY")) {
      res.status(503).json({ error: message });
    } else {
      res.status(502).json({ error: `Store lookup failed: ${message}` });
    }
    return;
  }

  res.json(GetNearbyStoresResponse.parse({ stores }));
});

export default router;
