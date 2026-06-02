// 菜单营养计算模块
import { USDA_FOODS } from './usda-mini';
import { FoodDataLoader, USDAFood } from './fooddata-loader';

export interface MenuIngredient {
    name: string;
    amount: number;
    matched?: string;
    source?: 'usda' | 'boohee' | 'fooddata' | 'china';
    nutrients?: Record<string, number>;
}

export interface NutritionResult {
    [key: string]: number;
}

interface BooheeNutrientItem {
    name: string;
    name_en?: string;
    value: number;
    unit_name: string;
    items?: BooheeNutrientItem[];
}

interface BooheeFoodDetail {
    food: { name: string; code: string };
    calory?: BooheeNutrientItem[];
    base_ingredients?: BooheeNutrientItem[];
    vitamin?: BooheeNutrientItem[];
    mineral?: BooheeNutrientItem[];
    amino_acid?: BooheeNutrientItem[];
    other_ingredients?: BooheeNutrientItem[];
}

interface BooheeSearchResponse {
    foods?: { code: string; name: string }[];
}

interface BooheeClient {
    searchFood(keyword: string): Promise<BooheeSearchResponse>;
    getFoodDetail(code: string): Promise<BooheeFoodDetail>;
}

interface CalcOptions {
    loader?: FoodDataLoader;
    boohee?: BooheeClient;
}

// ============== 中文食材映射 ==============
const FOOD_CN_MAP: Record<string, string> = {
    // 肉类
    '牛肉': 'beef', '猪肉': 'pork', '鸡肉': 'chicken', '鸡蛋': 'egg',
    '鸡': 'chicken', '鱼': 'fish', '虾': 'shrimp', '羊肉': 'lamb',
    '鸭肉': 'duck', '鹅肉': 'goose', '兔肉': 'rabbit', '猪肝': 'pork liver',
    '鸡胸肉': 'chicken breast', '鸡腿': 'chicken leg', '牛排': 'beef steak',
    '培根': 'bacon', '火腿': 'ham', '香肠': 'sausage',
    // 海鲜
    '三文鱼': 'salmon', '金枪鱼': 'tuna', '鳕鱼': 'cod', '带鱼': 'hairtail',
    '螃蟹': 'crab', '龙虾': 'lobster', '贝类': 'shellfish', '蛤蜊': 'clam',
    '牡蛎': 'oyster', '扇贝': 'scallop', '鱿鱼': 'squid', '章鱼': 'octopus',
    // 主食
    '米饭': 'rice, cooked', '大米': 'rice', '面粉': 'flour', '面条': 'noodles',
    '馒头': 'steamed bun', '面包': 'bread', '燕麦': 'oats', '玉米': 'corn',
    '小米': 'millet', '糙米': 'brown rice', '红薯': 'sweet potato',
    '土豆': 'potato', '芋头': 'taro', '山药': 'yam',
    // 蔬菜
    '西红柿': 'tomato', '番茄': 'tomato', '胡萝卜': 'carrot',
    '白菜': 'cabbage', '菠菜': 'spinach', '洋葱': 'onion', '大蒜': 'garlic',
    '姜': 'ginger', '豆腐': 'tofu', '蘑菇': 'mushroom', '青椒': 'green pepper',
    '黄瓜': 'cucumber', '茄子': 'eggplant', '西兰花': 'broccoli',
    '花菜': 'cauliflower', '芹菜': 'celery', '生菜': 'lettuce',
    '韭菜': 'chives', '蒜苗': 'garlic sprouts', '豆芽': 'bean sprouts',
    '南瓜': 'pumpkin', '冬瓜': 'winter melon', '丝瓜': 'loofah',
    '苦瓜': 'bitter melon', '莲藕': 'lotus root', '竹笋': 'bamboo shoots',
    // 水果
    '苹果': 'apple', '香蕉': 'banana', '橙子': 'orange', '柠檬': 'lemon',
    '葡萄': 'grape', '草莓': 'strawberry', '蓝莓': 'blueberry',
    '西瓜': 'watermelon', '哈密瓜': 'cantaloupe', '桃子': 'peach',
    '梨': 'pear', '芒果': 'mango', '菠萝': 'pineapple', '猕猴桃': 'kiwi',
    '樱桃': 'cherry', '荔枝': 'lychee', '龙眼': 'longan',
    // 豆类坚果
    '黄豆': 'soybean', '绿豆': 'mung bean', '红豆': 'red bean',
    '黑豆': 'black bean', '豌豆': 'pea', '花生': 'peanut',
    '核桃': 'walnut', '杏仁': 'almond', '腰果': 'cashew',
    '芝麻': 'sesame', '葵花籽': 'sunflower seed',
    // 乳制品
    '牛奶': 'milk', '酸奶': 'yogurt', '奶酪': 'cheese', '黄油': 'butter',
    '奶油': 'cream',
    // 调味料
    '菜籽油': 'oil, canola', '酱油': 'soy sauce', '盐': 'salt', '糖': 'sugar',
    '胡椒': 'pepper', '醋': 'vinegar', '蜂蜜': 'honey', '橄榄油': 'olive oil',
    '花椒': 'sichuan pepper', '八角': 'star anise', '桂皮': 'cinnamon',
};

// ============== DRIs ==============
export const DRIs: Record<string, Record<string, number>> = {
    '成年男性': {
        'Energy': 2250,
        'Protein': 65,
        'Total lipid (fat)': 75,
        'Carbohydrate, by difference': 300,
        'Fiber, total dietary': 25,
        'Cholesterol': 300,
        'Vitamin A, RAE': 800,
        'Vitamin D (D2 + D3)': 10,
        'Vitamin E (alpha-tocopherol)': 14,
        'Vitamin K (phylloquinone)': 80,
        'Thiamin': 1.4,
        'Riboflavin': 1.4,
        'Vitamin B-6': 1.4,
        'Vitamin B-12': 2.4,
        'Vitamin C, total ascorbic acid': 100,
        'Pantothenic acid': 5,
        'Folate, total': 400,
        'Niacin': 15,
        'Biotin': 40,
        'Calcium, Ca': 800,
        'Phosphorus, P': 720,
        'Potassium, K': 2000,
        'Sodium, Na': 1500,
        'Magnesium, Mg': 330,
        'Chloride, Cl': 2300,
        'Iron, Fe': 12,
        'Iodine, I': 120,
        'Zinc, Zn': 12.5,
        'Selenium, Se': 60,
        'Copper, Cu': 0.8,
        'Manganese, Mn': 4.5,
        'Choline, total': 500,
    },
    '成年女性': {
        'Energy': 1800,
        'Protein': 55,
        'Total lipid (fat)': 60,
        'Carbohydrate, by difference': 250,
        'Fiber, total dietary': 25,
        'Cholesterol': 300,
        'Vitamin A, RAE': 700,
        'Vitamin D (D2 + D3)': 10,
        'Vitamin E (alpha-tocopherol)': 14,
        'Vitamin K (phylloquinone)': 80,
        'Thiamin': 1.2,
        'Riboflavin': 1.2,
        'Vitamin B-6': 1.2,
        'Vitamin B-12': 2.4,
        'Vitamin C, total ascorbic acid': 100,
        'Pantothenic acid': 5,
        'Folate, total': 400,
        'Niacin': 12,
        'Biotin': 40,
        'Calcium, Ca': 800,
        'Phosphorus, P': 720,
        'Potassium, K': 2000,
        'Sodium, Na': 1500,
        'Magnesium, Mg': 280,
        'Chloride, Cl': 2300,
        'Iron, Fe': 20,
        'Iodine, I': 120,
        'Zinc, Zn': 7.5,
        'Selenium, Se': 60,
        'Copper, Cu': 0.8,
        'Manganese, Mn': 4.5,
        'Choline, total': 400,
    },
    '孕妇': {
        'Energy': 2100,
        'Protein': 70,
        'Total lipid (fat)': 70,
        'Carbohydrate, by difference': 275,
        'Fiber, total dietary': 25,
        'Cholesterol': 300,
        'Vitamin A, RAE': 770,
        'Vitamin D (D2 + D3)': 10,
        'Vitamin E (alpha-tocopherol)': 14,
        'Vitamin K (phylloquinone)': 80,
        'Thiamin': 1.5,
        'Riboflavin': 1.5,
        'Vitamin B-6': 1.9,
        'Vitamin B-12': 2.6,
        'Vitamin C, total ascorbic acid': 115,
        'Pantothenic acid': 6,
        'Folate, total': 600,
        'Niacin': 15,
        'Biotin': 40,
        'Calcium, Ca': 1000,
        'Phosphorus, P': 720,
        'Potassium, K': 2500,
        'Sodium, Na': 1500,
        'Magnesium, Mg': 370,
        'Chloride, Cl': 2300,
        'Iron, Fe': 29,
        'Iodine, I': 230,
        'Zinc, Zn': 9.5,
        'Selenium, Se': 65,
        'Copper, Cu': 0.9,
        'Manganese, Mn': 4.5,
        'Choline, total': 450,
    },
    '老年人(65+)': {
        'Energy': 1900,
        'Protein': 65,
        'Total lipid (fat)': 60,
        'Carbohydrate, by difference': 250,
        'Fiber, total dietary': 25,
        'Cholesterol': 300,
        'Vitamin A, RAE': 800,
        'Vitamin D (D2 + D3)': 15,
        'Vitamin E (alpha-tocopherol)': 14,
        'Vitamin K (phylloquinone)': 80,
        'Thiamin': 1.3,
        'Riboflavin': 1.3,
        'Vitamin B-6': 1.5,
        'Vitamin B-12': 2.4,
        'Vitamin C, total ascorbic acid': 100,
        'Pantothenic acid': 5,
        'Folate, total': 400,
        'Niacin': 13,
        'Biotin': 40,
        'Calcium, Ca': 1000,
        'Phosphorus, P': 720,
        'Potassium, K': 2000,
        'Sodium, Na': 1400,
        'Magnesium, Mg': 320,
        'Chloride, Cl': 2300,
        'Iron, Fe': 12,
        'Iodine, I': 120,
        'Zinc, Zn': 10,
        'Selenium, Se': 60,
        'Copper, Cu': 0.8,
        'Manganese, Mn': 4.5,
        'Choline, total': 450,
    },
};

// ============== 营养素单位 ==============
const UNITS: Record<string, string> = {
    'Energy': 'kcal', 'Protein': 'g', 'Total lipid (fat)': 'g',
    'Carbohydrate, by difference': 'g', 'Fiber, total dietary': 'g',
    'Cholesterol': 'mg', 'Vitamin A, RAE': 'μg', 'Vitamin D (D2 + D3)': 'μg',
    'Vitamin E (alpha-tocopherol)': 'mg', 'Vitamin K (phylloquinone)': 'μg',
    'Thiamin': 'mg', 'Riboflavin': 'mg', 'Vitamin B-6': 'mg', 'Vitamin B-12': 'μg',
    'Vitamin C, total ascorbic acid': 'mg', 'Pantothenic acid': 'mg',
    'Folate, total': 'μg', 'Niacin': 'mg', 'Calcium, Ca': 'mg', 'Phosphorus, P': 'mg',
    'Potassium, K': 'mg', 'Sodium, Na': 'mg', 'Magnesium, Mg': 'mg', 'Iron, Fe': 'mg',
    'Zinc, Zn': 'mg', 'Selenium, Se': 'μg', 'Copper, Cu': 'mg', 'Manganese, Mn': 'mg',
    'Chloride, Cl': 'mg', 'Iodine, I': 'μg', 'Choline, total': 'mg', 'Biotin': 'μg'
};

const NUTRIENT_CN_NAMES: Record<string, string> = {
    'Energy': '能量',
    'Protein': '蛋白质',
    'Total lipid (fat)': '脂肪',
    'Carbohydrate, by difference': '碳水化合物',
    'Fiber, total dietary': '膳食纤维',
    'Cholesterol': '胆固醇',
    'Vitamin A, RAE': '维生素A',
    'Vitamin D (D2 + D3)': '维生素D',
    'Vitamin E (alpha-tocopherol)': '维生素E',
    'Vitamin K (phylloquinone)': '维生素K',
    'Thiamin': '维生素B1',
    'Riboflavin': '维生素B2',
    'Vitamin B-6': '维生素B6',
    'Vitamin B-12': '维生素B12',
    'Vitamin C, total ascorbic acid': '维生素C',
    'Pantothenic acid': '泛酸',
    'Folate, total': '叶酸',
    'Niacin': '烟酸',
    'Calcium, Ca': '钙',
    'Phosphorus, P': '磷',
    'Potassium, K': '钾',
    'Sodium, Na': '钠',
    'Magnesium, Mg': '镁',
    'Chloride, Cl': '氯',
    'Iron, Fe': '铁',
    'Iodine, I': '碘',
    'Zinc, Zn': '锌',
    'Selenium, Se': '硒',
    'Copper, Cu': '铜',
    'Manganese, Mn': '锰',
    'Choline, total': '胆碱',
    'Biotin': '生物素',
};

function formatNutrientLabel(name: string): string {
    const cn = NUTRIENT_CN_NAMES[name];
    return cn ? `${cn} / ${name}` : name;
}

// ============== 菜单计算器类 ==============
export class MenuCalculator {
    private fallbackFoods: USDAFood[] = USDA_FOODS as USDAFood[];
    private lastBooheeError: string | null = null;
    private booheeAlias: Record<string, string> = {
        '能量': 'Energy',
        '热量': 'Energy',
        'energy': 'Energy',
        'calories': 'Energy',
        '蛋白质': 'Protein',
        'protein': 'Protein',
        '脂肪': 'Total lipid (fat)',
        'fat': 'Total lipid (fat)',
        'total fat': 'Total lipid (fat)',
        '碳水化合物': 'Carbohydrate, by difference',
        'carbohydrate': 'Carbohydrate, by difference',
        'carbs': 'Carbohydrate, by difference',
        '膳食纤维': 'Fiber, total dietary',
        '纤维': 'Fiber, total dietary',
        'fiber': 'Fiber, total dietary',
        '胆固醇': 'Cholesterol',
        'cholesterol': 'Cholesterol',
        '维生素a': 'Vitamin A, RAE',
        'vitamin a': 'Vitamin A, RAE',
        '维生素d': 'Vitamin D (D2 + D3)',
        'vitamin d': 'Vitamin D (D2 + D3)',
        '维生素e': 'Vitamin E (alpha-tocopherol)',
        'vitamin e': 'Vitamin E (alpha-tocopherol)',
        '维生素k': 'Vitamin K (phylloquinone)',
        'vitamin k': 'Vitamin K (phylloquinone)',
        '维生素b1': 'Thiamin',
        '硫胺素': 'Thiamin',
        'thiamin': 'Thiamin',
        '维生素b2': 'Riboflavin',
        '核黄素': 'Riboflavin',
        'riboflavin': 'Riboflavin',
        '维生素b6': 'Vitamin B-6',
        'vitamin b6': 'Vitamin B-6',
        '维生素b12': 'Vitamin B-12',
        'vitamin b12': 'Vitamin B-12',
        '维生素c': 'Vitamin C, total ascorbic acid',
        'vitamin c': 'Vitamin C, total ascorbic acid',
        '泛酸': 'Pantothenic acid',
        'pantothenic acid': 'Pantothenic acid',
        '叶酸': 'Folate, total',
        'folate': 'Folate, total',
        '尼克酸': 'Niacin',
        '烟酸': 'Niacin',
        'niacin': 'Niacin',
        '生物素': 'Biotin',
        'biotin': 'Biotin',
        '钙': 'Calcium, Ca',
        'calcium': 'Calcium, Ca',
        '磷': 'Phosphorus, P',
        'phosphorus': 'Phosphorus, P',
        '钾': 'Potassium, K',
        'potassium': 'Potassium, K',
        '钠': 'Sodium, Na',
        'sodium': 'Sodium, Na',
        '镁': 'Magnesium, Mg',
        'magnesium': 'Magnesium, Mg',
        '铁': 'Iron, Fe',
        'iron': 'Iron, Fe',
        '锌': 'Zinc, Zn',
        'zinc': 'Zinc, Zn',
        '硒': 'Selenium, Se',
        'selenium': 'Selenium, Se',
        '铜': 'Copper, Cu',
        'copper': 'Copper, Cu',
        '锰': 'Manganese, Mn',
        'manganese': 'Manganese, Mn',
        '胆碱': 'Choline, total',
        'choline': 'Choline, total',
    };
    
    private async ensureFoods(loader?: FoodDataLoader): Promise<USDAFood[]> {
        if (loader) return loader.getFoods();
        return this.fallbackFoods;
    }
    
    private searchUSDA(keyword: string, foods: USDAFood[]): USDAFood | null {
        const kw = keyword.toLowerCase().trim();
        if (!kw) return null;
        
        // 1. 精确匹配（名称完全包含关键词）
        const exactMatch = foods.find(f => f.n.toLowerCase().includes(kw));
        if (exactMatch) return exactMatch;
        
        // 2. 分词匹配（关键词的每个词都出现在名称中）
        const kwWords = kw.split(/[\s,]+/).filter(w => w.length > 1);
        if (kwWords.length > 1) {
            const multiWordMatch = foods.find(f => {
                const name = f.n.toLowerCase();
                return kwWords.every(w => name.includes(w));
            });
            if (multiWordMatch) return multiWordMatch;
        }
        
        // 3. 首词匹配（名称以关键词开头，用于匹配 "Beef, ..." 格式）
        const startsWithMatch = foods.find(f => {
            const name = f.n.toLowerCase();
            const firstPart = name.split(',')[0].trim();
            return firstPart === kw || firstPart.includes(kw);
        });
        if (startsWithMatch) return startsWithMatch;
        
        // 4. 模糊匹配（计算相似度分数）
        let bestMatch: USDAFood | null = null;
        let bestScore = 0;
        const minScore = 0.4; // 最低相似度阈值
        
        for (const food of foods) {
            const name = food.n.toLowerCase();
            const score = this.calculateSimilarity(kw, name);
            if (score > bestScore && score >= minScore) {
                bestScore = score;
                bestMatch = food;
            }
        }
        
        return bestMatch;
    }
    
    // 计算字符串相似度（基于共同词汇）
    private calculateSimilarity(query: string, target: string): number {
        const queryWords = new Set(query.split(/[\s,]+/).filter(w => w.length > 1));
        const targetWords = target.split(/[\s,]+/).filter(w => w.length > 1);
        
        if (queryWords.size === 0) return 0;
        
        let matches = 0;
        for (const tw of targetWords) {
            for (const qw of queryWords) {
                // 完全匹配或包含关系
                if (tw === qw || tw.includes(qw) || qw.includes(tw)) {
                    matches++;
                    break;
                }
            }
        }
        
        return matches / queryWords.size;
    }
    
    private searchChinese(cn: string, foods: USDAFood[]): USDAFood | null {
        // 1. 直接映射
        const en = FOOD_CN_MAP[cn];
        if (en) return this.searchUSDA(en, foods);
        
        // 2. 部分匹配映射（如 "鸡胸肉炒饭" 匹配 "鸡胸肉"）
        for (const [cnKey, enVal] of Object.entries(FOOD_CN_MAP)) {
            if (cn.includes(cnKey) || cnKey.includes(cn)) {
                const result = this.searchUSDA(enVal, foods);
                if (result) return result;
            }
        }
        
        // 3. 尝试用拼音或常见英文名搜索
        const commonTranslations: Record<string, string[]> = {
            '肉': ['meat', 'pork', 'beef'],
            '菜': ['vegetable', 'greens'],
            '饭': ['rice'],
            '面': ['noodle', 'flour'],
            '汤': ['soup'],
            '粥': ['porridge', 'congee'],
            '蛋': ['egg'],
            '奶': ['milk', 'dairy'],
            '油': ['oil'],
            '酱': ['sauce'],
            '糖': ['sugar'],
            '盐': ['salt'],
        };
        
        for (const [cnChar, enWords] of Object.entries(commonTranslations)) {
            if (cn.includes(cnChar)) {
                for (const enWord of enWords) {
                    const result = this.searchUSDA(enWord, foods);
                    if (result) return result;
                }
            }
        }
        
        return null;
    }
    
    parseMenu(text: string): MenuIngredient[] {
        return text.trim().split('\n')
            .map(line => line.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*[gG克]?$/))
            .filter(m => m)
            .map(m => ({ name: m![1].trim(), amount: parseFloat(m![2]) }));
    }
    
    private canonicalBooheeName(name?: string, nameEn?: string): string | null {
        const candidates = [nameEn, name].filter(Boolean) as string[];
        for (const raw of candidates) {
            const lower = raw.toLowerCase();
            if (this.booheeAlias[lower]) return this.booheeAlias[lower];
        }
        return candidates[0] || null;
    }
    
    private mergeBooheeItems(target: NutritionResult, items?: BooheeNutrientItem[]) {
        for (const item of items || []) {
            const name = this.canonicalBooheeName(item.name, item.name_en);
            if (!name || typeof item.value !== 'number') continue;
            target[name] = (target[name] || 0) + item.value;
            if (item.items?.length) this.mergeBooheeItems(target, item.items);
        }
    }
    
    private async fetchFromBoohee(name: string, client: BooheeClient): Promise<USDAFood | null> {
        try {
            const search = await client.searchFood(name);
            const target = search.foods?.[0];
            if (!target) return null;
            const detail = await client.getFoodDetail(target.code);
            const nutrients: NutritionResult = {};
            this.mergeBooheeItems(nutrients, detail.calory);
            this.mergeBooheeItems(nutrients, detail.base_ingredients);
            this.mergeBooheeItems(nutrients, detail.vitamin);
            this.mergeBooheeItems(nutrients, detail.mineral);
            this.mergeBooheeItems(nutrients, detail.other_ingredients);
            this.mergeBooheeItems(nutrients, detail.amino_acid);
            if (Object.keys(nutrients).length === 0) return null;
            return { n: detail.food?.name || target.name, d: nutrients };
        } catch (err) {
            if (!this.lastBooheeError) {
                this.lastBooheeError = err instanceof Error ? err.message : String(err);
            }
            console.warn('[MenuCalculator] Boohee fetch failed', err);
            return null;
        }
    }
    
    async calculate(text: string, opts: CalcOptions = {}): Promise<{ ingredients: MenuIngredient[], total: NutritionResult, unmatched: string[] }> {
        this.lastBooheeError = null;
        const foods = await this.ensureFoods(opts.loader);
        const ingredients = this.parseMenu(text);
        const total: NutritionResult = {};
        const unmatched: string[] = [];
        const defaultSource: MenuIngredient['source'] = opts.loader ? 'fooddata' : 'usda';
        
        for (const ing of ingredients) {
            let food = this.searchChinese(ing.name, foods) || this.searchUSDA(ing.name, foods);
            let source: MenuIngredient['source'] | undefined;
            if (food) {
                if (food.m?.dataType === 'China_Embedded') source = 'china';
                else source = opts.loader ? 'fooddata' : 'usda';
            }
            if (!food && opts.boohee) {
                food = await this.fetchFromBoohee(ing.name, opts.boohee);
                source = food ? 'boohee' : undefined;
            }
            if (food) {
                ing.matched = food.n;
                ing.source = source || defaultSource;
                ing.nutrients = food.d;  // 保存营养数据以便后续重新匹配
                const ratio = ing.amount / 100;
                for (const [k, v] of Object.entries(food.d)) {
                    total[k] = (total[k] || 0) + v * ratio;
                }
            } else {
                unmatched.push(ing.name);
            }
        }
        
        for (const k of Object.keys(total)) total[k] = Math.round(total[k] * 100) / 100;
        return { ingredients, total, unmatched };
    }

    getLastBooheeError() {
        return this.lastBooheeError;
    }

    // 单独匹配一个食材
    matchSingleIngredient(name: string, foods: USDAFood[]): { matched: string; nutrients: Record<string, number> } | null {
        const food = this.searchChinese(name, foods) || this.searchUSDA(name, foods);
        if (!food) return null;
        return { matched: food.n, nutrients: food.d };
    }

    // 汇总所有食材的营养素
    sumNutrients(ingredients: MenuIngredient[]): NutritionResult {
        const total: NutritionResult = {};
        for (const ing of ingredients) {
            if (!ing.nutrients) continue;
            const ratio = ing.amount / 100;
            for (const [k, v] of Object.entries(ing.nutrients)) {
                if (typeof v === 'number') {
                    total[k] = (total[k] || 0) + v * ratio;
                }
            }
        }
        for (const k of Object.keys(total)) total[k] = Math.round(total[k] * 100) / 100;
        return total;
    }
    
    compareDRIs(nutrition: NutritionResult, pop: string = '成年男性') {
        const dri = DRIs[pop] || DRIs['成年男性'];
        const result: Record<string, { value: number, dri: number, percent: number }> = {};
        for (const [k, v] of Object.entries(dri)) {
            result[k] = { value: nutrition[k] || 0, dri: v, percent: Math.round((nutrition[k] || 0) / v * 100) };
        }
        return result;
    }
    
    toMarkdown(total: NutritionResult, ingredients: MenuIngredient[], unmatched: string[], driPop?: string): string {
        let md = '## 营养计算结果\n\n### 食材\n| 食材 | 用量 | 匹配 |\n|---|---|---|\n';
        for (const i of ingredients) {
            const source = i.source ? ` (${i.source})` : '';
            md += `| ${i.name} | ${i.amount}g | ${i.matched ? i.matched + source : '❌'} |\n`;
        }
        if (unmatched.length) md += `\n> ⚠️ 未匹配: ${unmatched.join(', ')}\n`;
        
        md += '\n### 营养汇总\n| 营养素 | 含量 |';
        const dri = driPop ? this.compareDRIs(total, driPop) : null;
        if (dri) md += ' DRI% |';
        md += '\n|---|---|';
        if (dri) md += '---|';
        md += '\n';

        const orderedKeys: string[] = [];
        if (dri) orderedKeys.push(...Object.keys(dri));
        for (const k of Object.keys(total)) {
            if (!orderedKeys.includes(k)) orderedKeys.push(k);
        }

        for (const k of orderedKeys) {
            const v = total[k];
            if (typeof v !== 'number') continue;
            md += `| ${formatNutrientLabel(k)} | ${v} ${UNITS[k] || ''} |`;
            if (dri && dri[k]) md += ` ${dri[k].percent}% |`;
            md += '\n';
        }
        return md;
    }
}
