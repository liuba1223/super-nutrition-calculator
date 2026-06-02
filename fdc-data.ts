// Auto-generated FoodData Central loader
// Data is loaded from fdc-data.json at runtime

export type FDCFoodEntry = [string, Record<string, number>];

let cachedData: FDCFoodEntry[] | null = null;

export function getFDCFoods(): FDCFoodEntry[] {
    if (cachedData) return cachedData;
    // Data will be loaded by the plugin
    return [];
}

export function setFDCFoods(data: FDCFoodEntry[]): void {
    cachedData = data;
}
