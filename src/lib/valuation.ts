export interface InventoryItem {
    id: string;
    quantity: number;
    weighted_avg_cost: number;
}

/**
 * Calculates the new weighted average cost of an item after a purchase.
 * 
 * Formula: (Old Total Cost + New Purchase Cost) / (Old Quantity + New Quantity)
 * 
 * @param oldQuantity The quantity currently in stock before this purchase.
 * @param oldAvgCost The current weighted average cost per piece.
 * @param newQuantity The new quantity being added to stock (in base units).
 * @param totalPurchaseCost The total cost paid for this new batch.
 * @returns The updated weighted average cost per piece.
 */
export const calculateNewWeightedAverage = (
    oldQuantity: number,
    oldAvgCost: number,
    newQuantity: number,
    totalPurchaseCost: number
): number => {
    const updatedStock = Number(oldQuantity) + Number(newQuantity);
    if (updatedStock <= 0) return 0;

    const oldTotalValue = Number(oldQuantity) * Number(oldAvgCost);
    const newTotalValue = Number(totalPurchaseCost);

    return (oldTotalValue + newTotalValue) / updatedStock;
};

export interface StockBatch {
    id: string;
    quantity_remaining: number;
    unit_cost: number;
}

/**
 * Calculates COGS using FIFO.
 * Does NOT update the database; just returns the calculated cost and required batch updates.
 */
export const calculateFIFOCOGS = (
    quantityToSell: number,
    batches: StockBatch[]
): { totalCost: number; batchUpdates: { id: string; quantity_remaining: number }[] } => {
    let remaining = quantityToSell;
    let totalCost = 0;
    const batchUpdates: { id: string; quantity_remaining: number }[] = [];

    for (const batch of batches) {
        if (remaining <= 0) break;

        const take = Math.min(remaining, batch.quantity_remaining);
        totalCost += take * Number(batch.unit_cost);
        remaining -= take;

        batchUpdates.push({
            id: batch.id,
            quantity_remaining: Number(batch.quantity_remaining) - take
        });
    }

    return { totalCost, batchUpdates };
};
