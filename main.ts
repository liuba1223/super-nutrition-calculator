import { App, Plugin, PluginSettingTab, Setting, Notice, requestUrl, MarkdownView, ItemView, WorkspaceLeaf, Modal } from 'obsidian';
import * as crypto from 'crypto';
import { MenuCalculator, DRIs, MenuIngredient, NutritionResult } from './menu-calculator';
import { FoodDataLoader, USDAFood } from './fooddata-loader';

// ============== 常量 ==============
const VIEW_TYPE_NUTRITION = 'boohee-nutrition-view';
const VIEW_TYPE_MENU_CALC = 'menu-calculator-view';
const LOCAL_RESULT_LIMIT = 50;
const DEFAULT_BOOHEE_COVERAGE_LIMIT = 10;

const FOOD_CN_MAP: Record<string, string> = {
    '牛肉': 'beef', '猪肉': 'pork', '鸡肉': 'chicken', '鸡蛋': 'egg',
    '鸡': 'chicken', '鱼': 'fish', '虾': 'shrimp', '米饭': 'rice, cooked',
    '大米': 'rice', '面粉': 'flour', '苹果': 'apple', '香蕉': 'banana',
    '西红柿': 'tomato', '番茄': 'tomato', '土豆': 'potato', '胡萝卜': 'carrot',
    '白菜': 'cabbage', '菠菜': 'spinach', '洋葱': 'onion', '大蒜': 'garlic',
    '姜': 'ginger', '豆腐': 'tofu', '玉米': 'corn', '蘑菇': 'mushroom',
    '牛奶': 'milk', '黄油': 'butter', '菜籽油': 'oil, canola', '酱油': 'soy sauce',
    '盐': 'salt', '糖': 'sugar', '胡椒': 'pepper',
};

const DEFAULT_TARGET_NUTRIENTS = [
    'Energy',
    'Protein',
    'Total lipid (fat)',
    'Carbohydrate, by difference',
    'Fiber, total dietary',
    'Cholesterol',
    'Vitamin A, RAE',
    'Vitamin D (D2 + D3)',
    'Vitamin E (alpha-tocopherol)',
    'Vitamin K (phylloquinone)',
    'Thiamin',
    'Riboflavin',
    'Vitamin B-6',
    'Vitamin B-12',
    'Vitamin C, total ascorbic acid',
    'Pantothenic acid',
    'Folate, total',
    'Niacin',
    'Calcium, Ca',
    'Phosphorus, P',
    'Potassium, K',
    'Sodium, Na',
    'Magnesium, Mg',
    'Chloride, Cl',
    'Iron, Fe',
    'Iodine, I',
    'Zinc, Zn',
    'Selenium, Se',
    'Copper, Cu',
    'Manganese, Mn',
    'Choline, total',
    'Biotin'
];

const NUTRIENT_ALIASES: Record<string, string> = {
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
    'dietary fiber': 'Fiber, total dietary',
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
    '氯': 'Chloride, Cl',
    'chloride': 'Chloride, Cl',
    '铁': 'Iron, Fe',
    'iron': 'Iron, Fe',
    '碘': 'Iodine, I',
    'iodine': 'Iodine, I',
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
    '生物素': 'Biotin',
    'biotin': 'Biotin'
};

const NUTRIENT_UNITS: Record<string, string> = {
    'Energy': 'kcal',
    'Protein': 'g',
    'Total lipid (fat)': 'g',
    'Carbohydrate, by difference': 'g',
    'Fiber, total dietary': 'g',
    'Cholesterol': 'mg',
    'Vitamin A, RAE': 'μg',
    'Vitamin D (D2 + D3)': 'μg',
    'Vitamin E (alpha-tocopherol)': 'mg',
    'Vitamin K (phylloquinone)': 'μg',
    'Thiamin': 'mg',
    'Riboflavin': 'mg',
    'Vitamin B-6': 'mg',
    'Vitamin B-12': 'μg',
    'Vitamin C, total ascorbic acid': 'mg',
    'Pantothenic acid': 'mg',
    'Folate, total': 'μg',
    'Niacin': 'mg',
    'Calcium, Ca': 'mg',
    'Phosphorus, P': 'mg',
    'Potassium, K': 'mg',
    'Sodium, Na': 'mg',
    'Magnesium, Mg': 'mg',
    'Chloride, Cl': 'mg',
    'Iron, Fe': 'mg',
    'Iodine, I': 'μg',
    'Zinc, Zn': 'mg',
    'Selenium, Se': 'μg',
    'Copper, Cu': 'mg',
    'Manganese, Mn': 'mg',
    'Choline, total': 'mg',
    'Biotin': 'μg',
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

const BASE_NUTRIENTS = [
    'Protein',
    'Total lipid (fat)',
    'Carbohydrate, by difference',
    'Fiber, total dietary',
    'Cholesterol'
];
const VITAMIN_NUTRIENTS = [
    'Vitamin A, RAE',
    'Vitamin D (D2 + D3)',
    'Vitamin E (alpha-tocopherol)',
    'Vitamin K (phylloquinone)',
    'Thiamin',
    'Riboflavin',
    'Vitamin B-6',
    'Vitamin B-12',
    'Vitamin C, total ascorbic acid',
    'Pantothenic acid',
    'Folate, total',
    'Niacin',
    'Biotin'
];
const MINERAL_NUTRIENTS = [
    'Calcium, Ca',
    'Phosphorus, P',
    'Potassium, K',
    'Sodium, Na',
    'Magnesium, Mg',
    'Chloride, Cl',
    'Iron, Fe',
    'Iodine, I',
    'Zinc, Zn',
    'Selenium, Se',
    'Copper, Cu',
    'Manganese, Mn'
];
const OTHER_NUTRIENTS = ['Choline, total'];

// ============== 接口定义 ==============
interface BooheeNutritionSettings {
    appId: string;
    appKey: string;
    accessToken: string;
    tokenExpiredAt: string;
    foundationDataPath: string;
    legacyDataPath: string;
    dataPaths: string[];
    targetNutrients: string[];
    sortByCoverage: boolean;
    minCoverageCount: number;
    booheeCoverageFetchLimit: number;
    aiMappingEnabled: boolean;
    aiProvider: string;
    aiBaseUrl: string;
    aiApiKey: string;
    aiModel: string;
    aiPrompt: string;
    aiMappingCache: Record<string, string>;
    localFirst: boolean;
    aiFoodNameEnabled: boolean;
    aiFoodNamePrompt: string;
    aiFoodNameCache: Record<string, string>;
}

interface FoodSearchResult {
    id: number;
    code: string;
    name: string;
    thumb_image_url: string;
    is_liquid: boolean;
    health_light: number;
    weight: string;
    calory: string;
    source?: 'boohee' | 'fooddata';
    coverageCount?: number;
    coverageTotal?: number;
}

interface FoodSearchResponse {
    page: number;
    total_pages: number;
    foods: FoodSearchResult[];
}

interface NutrientItem {
    name: string;
    name_en?: string;
    value: number;
    unit_name: string;
    percent?: number;
    items?: NutrientItem[];
}

interface FoodDetailResponse {
    food: { name: string; code: string; thumb_image_url: string; large_image_url: string; };
    lights: string[];
    warnings: string[];
    calory: NutrientItem[];
    base_ingredients: NutrientItem[];
    vitamin: NutrientItem[];
    mineral: NutrientItem[];
    amino_acid: NutrientItem[];
    other_ingredients: NutrientItem[];
}
type AnyFoodDetail = FoodDetailResponse & { source?: 'boohee' | 'fooddata' };

const DEFAULT_SETTINGS: BooheeNutritionSettings = {
    appId: '',
    appKey: '',
    accessToken: '',
    tokenExpiredAt: '',
    foundationDataPath: '',
    legacyDataPath: '',
    dataPaths: [],
    targetNutrients: DEFAULT_TARGET_NUTRIENTS,
    sortByCoverage: true,
    minCoverageCount: 0,
    booheeCoverageFetchLimit: DEFAULT_BOOHEE_COVERAGE_LIMIT,
    aiMappingEnabled: false,
    aiProvider: 'openai-compatible',
    aiBaseUrl: '',
    aiApiKey: '',
    aiModel: '',
    aiPrompt: '你是营养字段映射助手。请从候选列表中选择最匹配的标准营养素名称；若无匹配请返回 null。仅输出 JSON：{"mapped": "<候选或null>"}。',
    aiMappingCache: {},
    localFirst: true,
    aiFoodNameEnabled: false,
    aiFoodNamePrompt: '你是食材翻译与标准化助手。请将中文食材名称翻译为英文，便于在 USDA/FoodData Central 中检索。仅输出 JSON：{"mapped": "<英文或null>"}。',
    aiFoodNameCache: {}
};

// ============== Sign算法 ==============
function generateSign(params: Record<string, string | number>, appKey: string): string {
    const sortedKeys = Object.keys(params).sort();
    let str = '';
    for (const key of sortedKeys) { str += key + params[key]; }
    return crypto.createHash('md5').update(appKey + str + appKey).digest('hex');
}

function buildTargetLookup(list: string[]) {
    const lookup = new Map<string, string>();
    for (const item of list) lookup.set(item.toLowerCase(), item);
    return lookup;
}

// ============== 主插件类 ==============
export default class BooheeNutritionPlugin extends Plugin {
    settings: BooheeNutritionSettings;
    foodDataLoader: FoodDataLoader;
    private aiMappingInFlight = new Map<string, Promise<string | null>>();

    async onload() {
        await this.loadSettings();
        // 获取插件目录的绝对路径
        const getPluginDir = (): string | undefined => {
            if (!this.manifest.dir) return undefined;
            // @ts-ignore - basePath exists on FileSystemAdapter
            const basePath = (this.app.vault.adapter as any).basePath;
            return basePath ? `${basePath}/${this.manifest.dir}` : undefined;
        };
        
        this.foodDataLoader = new FoodDataLoader(() => ({
            foundationDataPath: this.settings.foundationDataPath,
            legacyDataPath: this.settings.legacyDataPath,
            dataPaths: this.settings.dataPaths,
            pluginDir: getPluginDir()
        }));
        
        // 注册视图
        this.registerView(VIEW_TYPE_NUTRITION, (leaf) => new NutritionPanelView(leaf, this));
        this.registerView(VIEW_TYPE_MENU_CALC, (leaf) => new MenuCalcView(leaf, this, this.foodDataLoader));
        
        // 命令：打开面板
        this.addCommand({
            id: 'open-nutrition-panel',
            name: '打开营养查询面板',
            callback: () => this.activateView()
        });
        
        // 命令：打开菜单计算器
        this.addCommand({
            id: 'open-menu-calculator',
            name: '打开菜单营养计算器',
            callback: () => this.activateMenuCalcView()
        });
        
        // 命令：查询选中文字
        this.addCommand({
            id: 'search-selected-food',
            name: '查询选中文字的营养信息',
            editorCallback: async (editor) => {
                const selection = editor.getSelection();
                if (selection) {
                    await this.activateView();
                    const view = this.app.workspace.getLeavesOfType(VIEW_TYPE_NUTRITION)[0]?.view as NutritionPanelView;
                    if (view) view.searchFood(selection);
                } else { new Notice('请先选中要查询的食物名称'); }
            }
        });
        
        this.addSettingTab(new BooheeNutritionSettingTab(this.app, this));
        this.addRibbonIcon('apple', '超级营养计算器', () => this.activateView());
        this.addRibbonIcon('calculator', '菜单计算器', () => this.activateMenuCalcView());
    }

    async activateView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_NUTRITION)[0];
        if (!leaf) {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({ type: VIEW_TYPE_NUTRITION, active: true });
            }
        }
        if (leaf) workspace.revealLeaf(leaf);
    }

    async activateMenuCalcView() {
        const { workspace } = this.app;
        let leaf = workspace.getLeavesOfType(VIEW_TYPE_MENU_CALC)[0];
        if (!leaf) {
            const rightLeaf = workspace.getRightLeaf(false);
            if (rightLeaf) {
                leaf = rightLeaf;
                await leaf.setViewState({ type: VIEW_TYPE_MENU_CALC, active: true });
            }
        }
        if (leaf) workspace.revealLeaf(leaf);
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_NUTRITION);
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_MENU_CALC);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
        if (!Array.isArray(this.settings.dataPaths)) this.settings.dataPaths = [];
        if (!Array.isArray(this.settings.targetNutrients) || this.settings.targetNutrients.length === 0) {
            this.settings.targetNutrients = [...DEFAULT_TARGET_NUTRIENTS];
        }
        if (!this.settings.aiMappingCache || typeof this.settings.aiMappingCache !== 'object') {
            this.settings.aiMappingCache = {};
        }
        if (!this.settings.aiFoodNameCache || typeof this.settings.aiFoodNameCache !== 'object') {
            this.settings.aiFoodNameCache = {};
        }
    }
    async saveSettings() { await this.saveData(this.settings); }

    async getAccessToken(): Promise<string> {
        if (this.settings.accessToken && this.settings.tokenExpiredAt) {
            if (new Date(this.settings.tokenExpiredAt) > new Date()) return this.settings.accessToken;
        }
        if (!this.settings.appId || !this.settings.appKey) throw new Error('请先在设置中配置 App ID 和 App Key');
        const timestamp = Math.floor(Date.now() / 1000);
        const params = { app_id: this.settings.appId, timestamp };
        const sign = generateSign(params, this.settings.appKey);
        const response = await requestUrl({
            url: 'https://fc.boohee.com/api/v2/access_tokens',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...params, sign })
        });
        if (response.json.error) throw new Error(response.json.error.message);
        this.settings.accessToken = response.json.access_token;
        this.settings.tokenExpiredAt = response.json.expired_at;
        await this.saveSettings();
        return this.settings.accessToken;
    }

    async searchFood(keyword: string, searchType: string = 'all'): Promise<FoodSearchResponse> {
        const token = await this.getAccessToken();
        let url = `https://fc.boohee.com/api/v1/foods/search?q=${encodeURIComponent(keyword)}`;
        // 添加搜索类型参数
        if (searchType === 'brand') {
            url += '&kind=brand';
        } else if (searchType === 'restaurant') {
            url += '&kind=restaurant';
        }
        const response = await requestUrl({
            url,
            headers: { 'AccessToken': token }
        });
        if (response.json.error) throw new Error(response.json.error.message);
        return response.json;
    }

    async getFoodDetail(code: string): Promise<FoodDetailResponse> {
        const token = await this.getAccessToken();
        const response = await requestUrl({
            url: `https://fc.boohee.com/api/v3/foods/${code}`,
            headers: { 'AccessToken': token }
        });
        if (response.json.error) throw new Error(response.json.error.message);
        return response.json;
    }

    getTargetNutrients(): string[] {
        const list = this.settings.targetNutrients?.filter(v => v && v.trim()) || [];
        return list.length ? list : DEFAULT_TARGET_NUTRIENTS;
    }

    private normalizeNutrientKey(value: string) {
        return value
            .replace(/（.*?）|\(.*?\)/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    private resolveNutrientAlias(value: string, targetLookup: Map<string, string>): string | null {
        const normalized = this.normalizeNutrientKey(value);
        const mapped = NUTRIENT_ALIASES[normalized];
        if (mapped && targetLookup.has(mapped.toLowerCase())) return mapped;
        if (targetLookup.has(normalized)) return targetLookup.get(normalized) || null;
        return null;
    }

    private buildAiEndpoint(): string | null {
        const base = (this.settings.aiBaseUrl || '').trim();
        if (!base) return null;
        const trimmed = base.replace(/\/+$/, '');
        if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
        return `${trimmed}/v1/chat/completions`;
    }

    private extractJson(text: string): Record<string, any> | null {
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return null;
        try {
            return JSON.parse(match[0]);
        } catch {
            return null;
        }
    }

    private hasCJK(text: string) {
        return /[\u4e00-\u9fff]/.test(text);
    }

    private async mapFoodNameWithAI(raw: string): Promise<string | null> {
        if (!this.settings.aiFoodNameEnabled) return null;
        if (!this.settings.aiApiKey || !this.settings.aiModel) return null;
        const endpoint = this.buildAiEndpoint();
        if (!endpoint) return null;
        const key = this.normalizeNutrientKey(raw);
        if (this.settings.aiFoodNameCache[key] !== undefined) {
            const cached = this.settings.aiFoodNameCache[key];
            return cached ? cached : null;
        }
        if (this.aiMappingInFlight.has(key)) return this.aiMappingInFlight.get(key)!;
        const task = (async () => {
            const system = this.settings.aiFoodNamePrompt || DEFAULT_SETTINGS.aiFoodNamePrompt;
            const user = `输入食材名称: ${raw}`;
            try {
                const response = await requestUrl({
                    url: endpoint,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.settings.aiApiKey}`
                    },
                    body: JSON.stringify({
                        model: this.settings.aiModel,
                        messages: [
                            { role: 'system', content: system },
                            { role: 'user', content: user }
                        ],
                        temperature: 0
                    })
                });
                const content = response.json?.choices?.[0]?.message?.content || '';
                const parsed = this.extractJson(content);
                let mapped = parsed?.mapped;
                if (typeof mapped === 'string') mapped = mapped.trim();
                if (!mapped) {
                    this.settings.aiFoodNameCache[key] = '';
                } else {
                    this.settings.aiFoodNameCache[key] = mapped;
                }
                await this.saveSettings();
                const result = this.settings.aiFoodNameCache[key];
                return result ? result : null;
            } catch (err) {
                console.warn('[AI Name Mapping] Failed', err);
                return null;
            } finally {
                this.aiMappingInFlight.delete(key);
            }
        })();
        this.aiMappingInFlight.set(key, task);
        return task;
    }

    async mapFoodNameForSearch(raw: string): Promise<string | null> {
        if (!this.hasCJK(raw)) return null;
        return this.mapFoodNameWithAI(raw);
    }

    private async mapNutrientWithAI(raw: string, nameEn: string | undefined, targetList: string[]): Promise<string | null> {
        if (!this.settings.aiMappingEnabled) return null;
        if (!this.settings.aiApiKey || !this.settings.aiModel) return null;
        const endpoint = this.buildAiEndpoint();
        if (!endpoint) return null;
        const key = this.normalizeNutrientKey(`${raw}||${nameEn || ''}`);
        if (this.settings.aiMappingCache[key] !== undefined) {
            const cached = this.settings.aiMappingCache[key];
            return cached ? cached : null;
        }
        if (this.aiMappingInFlight.has(key)) return this.aiMappingInFlight.get(key)!;
        const task = (async () => {
            const system = this.settings.aiPrompt || DEFAULT_SETTINGS.aiPrompt;
            const user = `输入字段: ${raw}\n英文名: ${nameEn || ''}\n候选列表: ${targetList.join(', ')}`;
            try {
                const response = await requestUrl({
                    url: endpoint,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.settings.aiApiKey}`
                    },
                    body: JSON.stringify({
                        model: this.settings.aiModel,
                        messages: [
                            { role: 'system', content: system },
                            { role: 'user', content: user }
                        ],
                        temperature: 0
                    })
                });
                const content = response.json?.choices?.[0]?.message?.content || '';
                const parsed = this.extractJson(content);
                let mapped = parsed?.mapped;
                if (typeof mapped === 'string') mapped = mapped.trim();
                const targetLookup = buildTargetLookup(targetList);
                if (mapped && targetLookup.has(mapped.toLowerCase())) {
                    this.settings.aiMappingCache[key] = targetLookup.get(mapped.toLowerCase()) || mapped;
                } else {
                    const directHit = targetList.find(v => content.includes(v));
                    this.settings.aiMappingCache[key] = directHit || '';
                }
                await this.saveSettings();
                const result = this.settings.aiMappingCache[key];
                return result ? result : null;
            } catch (err) {
                console.warn('[AI Mapping] Failed', err);
                return null;
            } finally {
                this.aiMappingInFlight.delete(key);
            }
        })();
        this.aiMappingInFlight.set(key, task);
        return task;
    }

    async mapNutrientName(raw?: string, nameEn?: string): Promise<string | null> {
        const targetList = this.getTargetNutrients();
        const targetLookup = buildTargetLookup(targetList);
        const candidates = [nameEn, raw].filter(Boolean) as string[];
        for (const candidate of candidates) {
            const mapped = this.resolveNutrientAlias(candidate, targetLookup);
            if (mapped) return mapped;
        }
        const primary = raw || nameEn;
        if (!primary) return null;
        return this.mapNutrientWithAI(primary, nameEn, targetList);
    }
}

// ============== 右侧边栏视图 ==============
class NutritionPanelView extends ItemView {
    plugin: BooheeNutritionPlugin;
    containerEl: HTMLElement;
    searchInput: HTMLInputElement;
    contentArea: HTMLElement;
    foods: FoodSearchResult[] = [];
    currentDetail: AnyFoodDetail | null = null;
    standardRows: { name: string; value: string; unit: string }[] = [];
    currentLocalFood: USDAFood | null = null;
    localFoodIndex = new Map<string, USDAFood>();
    localNoticeShown = false;

    constructor(leaf: WorkspaceLeaf, plugin: BooheeNutritionPlugin) {
        super(leaf);
        this.plugin = plugin;
    }

    getViewType() { return VIEW_TYPE_NUTRITION; }
    getDisplayText() { return '营养查询'; }
    getIcon() { return 'apple'; }

    async onOpen() {
        this.containerEl = this.contentEl;
        this.containerEl.empty();
        this.containerEl.addClass('boohee-panel');
        this.renderPanel();
    }

    renderPanel() {
        this.containerEl.empty();
        
        // 头部
        const header = this.containerEl.createDiv({ cls: 'boohee-panel-header' });
        header.createEl('h3', { text: '营养查询' });
        
        // 搜索区
        const searchArea = this.containerEl.createDiv({ cls: 'boohee-search-area' });
        const searchRow = searchArea.createDiv({ cls: 'boohee-search-row' });
        this.searchInput = searchRow.createEl('input', {
            type: 'text',
            placeholder: '输入食物名称...',
            cls: 'boohee-input'
        });
        const searchBtn = searchRow.createEl('button', { text: '搜索', cls: 'boohee-btn boohee-btn-primary' });
        searchBtn.onclick = () => this.doSearch();
        this.searchInput.onkeydown = (e) => { if (e.key === 'Enter') this.doSearch(); };
        
        // 快捷标签
        const tags = searchArea.createDiv({ cls: 'boohee-tags' });
        ['苹果', '鸡蛋', '米饭', '牛奶', '鸡胸肉'].forEach(food => {
            const tag = tags.createEl('span', { text: food, cls: 'boohee-tag' });
            tag.onclick = () => { this.searchInput.value = food; this.doSearch(); };
        });
        
        // 内容区
        this.contentArea = this.containerEl.createDiv({ cls: 'boohee-content' });
        this.showWelcome();
    }

    showWelcome() {
        this.contentArea.empty();
        const welcome = this.contentArea.createDiv({ cls: 'boohee-welcome' });
        welcome.innerHTML = '<div class="boohee-icon">🥗</div><p>输入食物名称开始查询</p>';
    }

    showLoading(text = '加载中...') {
        this.contentArea.empty();
        const loading = this.contentArea.createDiv({ cls: 'boohee-loading' });
        loading.innerHTML = `<div class="boohee-spinner"></div><p>${text}</p>`;
    }

    searchFood(keyword: string) {
        this.searchInput.value = keyword;
        this.doSearch();
    }

    async doSearch() {
        const keyword = this.searchInput.value.trim();
        if (!keyword) { new Notice('请输入食物名称'); return; }
        this.showLoading(`搜索 "${keyword}"...`);
        let localFoods: FoodSearchResult[] = [];
        let mappedKeyword: string | null = null;
        try {
            const foods = await this.plugin.foodDataLoader.getFoods();
            localFoods = this.buildLocalResults(foods, keyword);
            if (!localFoods.length) {
                mappedKeyword = await this.plugin.mapFoodNameForSearch(keyword);
                if (mappedKeyword) localFoods = this.buildLocalResults(foods, mappedKeyword);
            }
            const diag = this.plugin.foodDataLoader.getLastDiagnostics();
            if (diag.errors.length && !this.localNoticeShown) {
                this.localNoticeShown = true;
                new Notice(`FoodData 加载警告: ${diag.errors[0]}`);
            } else if (diag.usedFallback && !this.localNoticeShown) {
                this.localNoticeShown = true;
                new Notice('FoodData 未配置或加载失败，已使用内置小型库');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            new Notice(`本地数据库查询失败: ${message}`);
        }

        const targetTotal = this.plugin.getTargetNutrients().length;
        let booheeFoods: FoodSearchResult[] = [];
        let booheeError: Error | null = null;
        const shouldUseBoohee = !localFoods.length || !this.plugin.settings.localFirst;
        if (shouldUseBoohee) {
            try {
                const results = await this.plugin.searchFood(keyword);
                booheeFoods = (results.foods || []).map(f => ({ ...f, source: 'boohee' }));
            } catch (error) {
                booheeError = error instanceof Error ? error : new Error(String(error));
            }
        }
        if (this.plugin.settings.sortByCoverage && booheeFoods.length) {
            await this.enrichCoverageForBoohee(booheeFoods);
        }

        if (mappedKeyword) new Notice(`AI 映射检索关键词: ${mappedKeyword}`);
        this.foods = this.mergeResults(booheeFoods, localFoods);
        this.foods = this.applyCoverageFilterAndSort(this.foods, targetTotal);
        if (!this.foods.length) {
            this.contentArea.empty();
            if (booheeError) {
                this.contentArea.createDiv({ cls: 'boohee-error' }).innerHTML = `<p>搜索失败: ${booheeError.message}</p>`;
            } else {
                this.contentArea.createDiv({ cls: 'boohee-empty' }).innerHTML = `<p>未找到 "${keyword}"</p>`;
            }
            return;
        }
        if (booheeError) new Notice(`薄荷接口失败: ${booheeError.message}`);
        this.showFoodList();
    }

    private normalizeName(name: string) {
        return name.trim().toLowerCase();
    }

    private collectNutrients(food: USDAFood, names: string[]): NutrientItem[] {
        const items: NutrientItem[] = [];
        for (const name of names) {
            const value = food.d[name];
            if (typeof value !== 'number') continue;
            items.push({
                name,
                value: Math.round(value * 100) / 100,
                unit_name: NUTRIENT_UNITS[name] || ''
            });
        }
        return items;
    }

    private buildStandardRowsFromMap(map: Map<string, { value: number; unit?: string }>): { name: string; value: string; unit: string }[] {
        const targets = this.plugin.getTargetNutrients();
        return targets.map(name => {
            const hit = map.get(name);
            if (!hit || typeof hit.value !== 'number') {
                return { name, value: '\\', unit: NUTRIENT_UNITS[name] || '' };
            }
            const value = Math.round(hit.value * 100) / 100;
            return { name, value: String(value), unit: NUTRIENT_UNITS[name] || hit.unit || '' };
        });
    }

    private async buildStandardRowsFromBoohee(detail: FoodDetailResponse): Promise<{ name: string; value: string; unit: string }[]> {
        const map = new Map<string, { value: number; unit?: string }>();
        const items = [
            ...this.flattenBooheeItems(detail.calory),
            ...this.flattenBooheeItems(detail.base_ingredients),
            ...this.flattenBooheeItems(detail.vitamin),
            ...this.flattenBooheeItems(detail.mineral),
            ...this.flattenBooheeItems(detail.other_ingredients),
            ...this.flattenBooheeItems(detail.amino_acid)
        ];
        for (const item of items) {
            if (!item?.name || typeof item.value !== 'number') continue;
            const mapped = await this.plugin.mapNutrientName(item.name, item.name_en);
            if (!mapped) continue;
            const prev = map.get(mapped);
            const nextValue = (prev?.value || 0) + item.value;
            map.set(mapped, { value: nextValue, unit: item.unit_name });
        }
        return this.buildStandardRowsFromMap(map);
    }

    private buildStandardRowsFromLocal(food: USDAFood): { name: string; value: string; unit: string }[] {
        const targets = this.plugin.getTargetNutrients();
        const targetLookup = buildTargetLookup(targets);
        const map = new Map<string, { value: number; unit?: string }>();
        for (const [key, value] of Object.entries(food.d || {})) {
            if (typeof value !== 'number') continue;
            const mapped = this.resolveLocalNutrient(key, targetLookup);
            if (!mapped) continue;
            map.set(mapped, { value, unit: NUTRIENT_UNITS[mapped] });
        }
        return this.buildStandardRowsFromMap(map);
    }

    private renderStandardTable(container: HTMLElement) {
        if (!this.standardRows.length) return;
        const section = container.createDiv({ cls: 'boohee-section' });
        section.createEl('h5', { text: '📊 标准营养表（目标清单）' });
        const table = section.createEl('table', { cls: 'boohee-table' });
        const header = table.createEl('tr');
        header.createEl('th', { text: '营养素' });
        header.createEl('th', { text: '含量' });
        header.createEl('th', { text: '单位' });
        for (const row of this.standardRows) {
            const tr = table.createEl('tr');
            tr.createEl('td', { text: formatNutrientLabel(row.name) });
            tr.createEl('td', { text: row.value });
            tr.createEl('td', { text: row.unit });
        }
    }

    private buildLocalDetail(food: USDAFood, code: string): AnyFoodDetail {
        const calory = this.collectNutrients(food, ['Energy']);
        const base = this.collectNutrients(food, BASE_NUTRIENTS);
        const vitamins = this.collectNutrients(food, VITAMIN_NUTRIENTS);
        const minerals = this.collectNutrients(food, MINERAL_NUTRIENTS);
        const others = this.collectNutrients(food, OTHER_NUTRIENTS);
        return {
            source: 'fooddata',
            food: {
                name: food.n,
                code,
                thumb_image_url: '',
                large_image_url: ''
            },
            lights: [],
            warnings: [],
            calory,
            base_ingredients: base,
            vitamin: vitamins,
            mineral: minerals,
            amino_acid: [],
            other_ingredients: others
        };
    }

    private buildLocalResults(foods: USDAFood[], keyword: string): FoodSearchResult[] {
        this.localFoodIndex.clear();
        const keys = new Set<string>();
        keys.add(this.normalizeName(keyword));
        const mapped = FOOD_CN_MAP[keyword];
        if (mapped) keys.add(this.normalizeName(mapped));
        const targetList = this.plugin.getTargetNutrients();
        const targetLookup = buildTargetLookup(targetList);
        const results: FoodSearchResult[] = [];
        let seq = 0;
        for (const food of foods) {
            const name = food.n || '';
            const lower = name.toLowerCase();
            let hit = false;
            for (const key of keys) {
                if (lower.includes(key)) { hit = true; break; }
            }
            if (!hit) continue;
            seq += 1;
            const code = `local:${seq}`;
            const energy = food.d['Energy'];
            const coverageCount = this.countCoverageFromLocal(food, targetLookup);
            this.localFoodIndex.set(code, food);
            results.push({
                id: -seq,
                code,
                name: food.n,
                thumb_image_url: '',
                is_liquid: false,
                health_light: 0,
                weight: '100',
                calory: typeof energy === 'number' ? String(Math.round(energy)) : '--',
                source: 'fooddata',
                coverageCount,
                coverageTotal: targetList.length
            });
            if (results.length >= LOCAL_RESULT_LIMIT) break;
        }
        return results;
    }

    private mergeResults(booheeFoods: FoodSearchResult[], localFoods: FoodSearchResult[]): FoodSearchResult[] {
        const seen = new Set(booheeFoods.map(f => this.normalizeName(f.name)));
        const merged = [...booheeFoods];
        for (const local of localFoods) {
            if (!seen.has(this.normalizeName(local.name))) merged.push(local);
        }
        return merged;
    }

    private applyCoverageFilterAndSort(foods: FoodSearchResult[], total: number) {
        const minCoverage = Math.max(0, this.plugin.settings.minCoverageCount || 0);
        let filtered = foods;
        if (minCoverage > 0) {
            filtered = foods.filter(f => (f.coverageCount || 0) >= minCoverage);
        }
        if (this.plugin.settings.sortByCoverage) {
            filtered = [...filtered].sort((a, b) => (b.coverageCount || 0) - (a.coverageCount || 0));
        }
        for (const f of filtered) {
            if (f.coverageTotal === undefined) f.coverageTotal = total;
        }
        return filtered;
    }

    private resolveLocalNutrient(name: string, targetLookup: Map<string, string>): string | null {
        const normalized = this.normalizeName(name);
        const alias = NUTRIENT_ALIASES[normalized];
        if (alias && targetLookup.has(alias.toLowerCase())) return alias;
        if (targetLookup.has(normalized)) return targetLookup.get(normalized) || null;
        return null;
    }

    private countCoverageFromLocal(food: USDAFood, targetLookup: Map<string, string>): number {
        const covered = new Set<string>();
        for (const key of Object.keys(food.d || {})) {
            const mapped = this.resolveLocalNutrient(key, targetLookup);
            if (mapped) covered.add(mapped);
        }
        return covered.size;
    }

    private flattenBooheeItems(items?: NutrientItem[]): NutrientItem[] {
        const list: NutrientItem[] = [];
        for (const item of items || []) {
            list.push(item);
            if (item.items?.length) list.push(...this.flattenBooheeItems(item.items));
        }
        return list;
    }

    private async countCoverageFromBoohee(detail: FoodDetailResponse): Promise<number> {
        const targetList = this.plugin.getTargetNutrients();
        const targetLookup = buildTargetLookup(targetList);
        const covered = new Set<string>();
        const allItems = [
            ...this.flattenBooheeItems(detail.calory),
            ...this.flattenBooheeItems(detail.base_ingredients),
            ...this.flattenBooheeItems(detail.vitamin),
            ...this.flattenBooheeItems(detail.mineral),
            ...this.flattenBooheeItems(detail.other_ingredients),
            ...this.flattenBooheeItems(detail.amino_acid)
        ];
        for (const item of allItems) {
            if (!item?.name) continue;
            const mapped = await this.plugin.mapNutrientName(item.name, item.name_en);
            if (mapped && targetLookup.has(mapped.toLowerCase())) covered.add(mapped);
        }
        return covered.size;
    }

    private async enrichCoverageForBoohee(foods: FoodSearchResult[]) {
        const limit = Math.max(0, this.plugin.settings.booheeCoverageFetchLimit || 0);
        const targetTotal = this.plugin.getTargetNutrients().length;
        if (!limit) return;
        const candidates = foods.slice(0, limit);
        for (const food of candidates) {
            try {
                const detail = await this.plugin.getFoodDetail(food.code);
                const coverageCount = await this.countCoverageFromBoohee(detail);
                food.coverageCount = coverageCount;
                food.coverageTotal = targetTotal;
            } catch {
                food.coverageCount = food.coverageCount || 0;
                food.coverageTotal = targetTotal;
            }
        }
    }

    showFoodList() {
        this.contentArea.empty();
        const header = this.contentArea.createDiv({ cls: 'boohee-list-header' });
        header.createEl('span', { text: `找到 ${this.foods.length} 个结果` });
        
        const list = this.contentArea.createDiv({ cls: 'boohee-food-list' });
        for (const food of this.foods) {
            const item = list.createDiv({ cls: 'boohee-food-item' });
            if (food.thumb_image_url) {
                item.createEl('img', { attr: { src: food.thumb_image_url }, cls: 'boohee-food-img' });
            } else {
                item.createDiv({ cls: 'boohee-food-img-placeholder', text: '🍽️' });
            }
            const info = item.createDiv({ cls: 'boohee-food-info' });
            info.createEl('div', { text: food.name, cls: 'boohee-food-name' });
            const total = food.coverageTotal || this.plugin.getTargetNutrients().length;
            const coverageText = food.coverageCount !== undefined ? ` · 覆盖 ${food.coverageCount}/${total}` : '';
            info.createEl('div', { text: `${food.calory} 千卡/${food.weight}g${coverageText}`, cls: 'boohee-food-cal' });
            const lightLabels = ['', '推荐', '适量', '少吃'];
            const lightColors = ['', 'green', 'yellow', 'red'];
            if (food.health_light > 0) {
                info.createEl('span', { text: lightLabels[food.health_light], cls: `boohee-badge boohee-badge-${lightColors[food.health_light]}` });
            } else if (food.source === 'fooddata') {
                info.createEl('span', { text: '本地库', cls: 'boohee-badge boohee-badge-gray' });
            }
            // 数据源选择按钮
            const sourceBtn = item.createEl('button', { text: '▼', cls: 'boohee-source-btn' });
            sourceBtn.onclick = (e) => {
                e.stopPropagation();
                this.showSourceSelector(food, sourceBtn);
            };
            item.onclick = () => this.showDetail(food);
        }
    }

    private showSourceSelector(food: FoodSearchResult, anchorEl: HTMLElement) {
        // 移除已有的选择器
        document.querySelectorAll('.boohee-source-dropdown').forEach(el => el.remove());
        
        const dropdown = document.createElement('div');
        dropdown.className = 'boohee-source-dropdown';
        
        // 获取可用的数据源
        const sources = this.getAvailableSources(food);
        
        for (const src of sources) {
            const option = dropdown.createDiv({ cls: 'boohee-source-option' });
            option.innerHTML = `<span class="source-icon">${src.icon}</span><span class="source-name">${src.name}</span><span class="source-desc">${src.desc}</span>`;
            option.onclick = (e) => {
                e.stopPropagation();
                dropdown.remove();
                this.showDetailWithSource(food, src.type);
            };
        }
        
        // 定位下拉菜单
        const rect = anchorEl.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.right = `${window.innerWidth - rect.right}px`;
        document.body.appendChild(dropdown);
        
        // 点击其他地方关闭
        const closeHandler = (e: MouseEvent) => {
            if (!dropdown.contains(e.target as Node)) {
                dropdown.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    private getAvailableSources(food: FoodSearchResult): { type: string; name: string; icon: string; desc: string }[] {
        const sources: { type: string; name: string; icon: string; desc: string }[] = [];
        
        // 薄荷数据源
        sources.push({ type: 'boohee', name: '薄荷健康', icon: '🥗', desc: '中国食物数据' });
        sources.push({ type: 'boohee_brand', name: '薄荷品牌', icon: '🏷️', desc: '品牌食品数据' });
        sources.push({ type: 'boohee_restaurant', name: '薄荷餐厅', icon: '🍜', desc: '餐厅菜品数据' });
        
        // USDA/FoodData 数据源
        sources.push({ type: 'usda', name: 'USDA FoodData', icon: '🇺🇸', desc: '美国农业部数据' });
        
        // 如果当前食物已有本地匹配，标记出来
        if (food.source === 'fooddata') {
            const usdaIdx = sources.findIndex(s => s.type === 'usda');
            if (usdaIdx >= 0) sources[usdaIdx].desc = '美国农业部数据 ✓';
        } else if (food.source === 'boohee') {
            sources[0].desc = '中国食物数据 ✓';
        }
        
        return sources;
    }

    private async showDetailWithSource(food: FoodSearchResult, sourceType: string) {
        this.showLoading(`从 ${this.getSourceName(sourceType)} 获取 "${food.name}"...`);
        try {
            if (sourceType === 'usda') {
                // 从 USDA/FoodData 获取
                const foods = await this.plugin.foodDataLoader.getFoods();
                const localResults = this.buildLocalResults(foods, food.name);
                if (localResults.length > 0) {
                    const localFood = this.localFoodIndex.get(localResults[0].code);
                    if (localFood) {
                        this.currentLocalFood = localFood;
                        this.currentDetail = this.buildLocalDetail(localFood, localResults[0].code);
                        this.standardRows = this.buildStandardRowsFromLocal(localFood);
                        this.renderDetail();
                        return;
                    }
                }
                throw new Error('USDA 数据库中未找到该食材');
            } else if (sourceType.startsWith('boohee')) {
                // 从薄荷获取（不同类型）
                const searchType = sourceType === 'boohee_brand' ? 'brand' : 
                                   sourceType === 'boohee_restaurant' ? 'restaurant' : 'all';
                const results = await this.plugin.searchFood(food.name, searchType);
                if (results.foods?.length > 0) {
                    this.currentLocalFood = null;
                    this.currentDetail = await this.plugin.getFoodDetail(results.foods[0].code);
                    this.standardRows = await this.buildStandardRowsFromBoohee(this.currentDetail);
                    this.renderDetail();
                    return;
                }
                throw new Error(`薄荷 ${this.getSourceName(sourceType)} 中未找到该食材`);
            }
        } catch (error) {
            this.contentArea.empty();
            this.contentArea.createDiv({ cls: 'boohee-error' }).innerHTML = `<p>获取失败: ${error.message}</p>`;
        }
    }

    private getSourceName(sourceType: string): string {
        const names: Record<string, string> = {
            'boohee': '薄荷健康',
            'boohee_brand': '薄荷品牌',
            'boohee_restaurant': '薄荷餐厅',
            'usda': 'USDA FoodData'
        };
        return names[sourceType] || sourceType;
    }

    async showDetail(food: FoodSearchResult) {
        this.showLoading(`获取 "${food.name}" 详情...`);
        try {
            if (food.source === 'fooddata' || food.code.startsWith('local:')) {
                const local = this.localFoodIndex.get(food.code);
                if (!local) throw new Error('本地数据库未找到该食材');
                this.currentLocalFood = local;
                this.currentDetail = this.buildLocalDetail(local, food.code);
                this.standardRows = this.buildStandardRowsFromLocal(local);
            } else {
                this.currentLocalFood = null;
                this.currentDetail = await this.plugin.getFoodDetail(food.code);
                this.standardRows = await this.buildStandardRowsFromBoohee(this.currentDetail);
            }
            this.renderDetail();
        } catch (error) {
            this.contentArea.empty();
            this.contentArea.createDiv({ cls: 'boohee-error' }).innerHTML = `<p>获取失败: ${error.message}</p>`;
        }
    }

    renderDetail() {
        if (!this.currentDetail) return;
        this.contentArea.empty();
        const d = this.currentDetail;
        
        // 返回按钮
        const backBtn = this.contentArea.createEl('button', { text: '← 返回列表', cls: 'boohee-back-btn' });
        backBtn.onclick = () => this.showFoodList();
        
        // 头部
        const header = this.contentArea.createDiv({ cls: 'boohee-detail-header' });
        if (d.food.thumb_image_url) header.createEl('img', { attr: { src: d.food.thumb_image_url }, cls: 'boohee-detail-img' });
        const titleArea = header.createDiv({ cls: 'boohee-detail-title' });
        titleArea.createEl('h4', { text: d.food.name });
        if (d.source === 'fooddata') {
            titleArea.createEl('div', { text: '来源: FoodData Central (每100g)', cls: 'boohee-detail-source' });
        }
        if (d.lights?.length) titleArea.createEl('div', { text: '✅ ' + d.lights.join('、'), cls: 'boohee-lights' });
        if (d.warnings?.length) titleArea.createEl('div', { text: '⚠️ ' + d.warnings.join('、'), cls: 'boohee-warnings' });
        
        // 营养信息
        const sections = this.contentArea.createDiv({ cls: 'boohee-sections' });
        this.renderStandardTable(sections);
        this.renderTable(sections, '🔥 热量', d.calory);
        this.renderTable(sections, '🥗 三大营养素', d.base_ingredients, true);
        if (d.vitamin?.filter(v => v.value > 0).length) this.renderTable(sections, '💊 维生素', d.vitamin.filter(v => v.value > 0));
        if (d.mineral?.filter(m => m.value > 0).length) this.renderTable(sections, '⚗️ 矿物质', d.mineral.filter(m => m.value > 0));
        
        // 操作按钮
        const actions = this.contentArea.createDiv({ cls: 'boohee-actions' });
        const insertBtn = actions.createEl('button', { text: '📝 插入笔记', cls: 'boohee-btn boohee-btn-primary' });
        insertBtn.onclick = () => this.insertToNote();
        const copyBtn = actions.createEl('button', { text: '📋 复制', cls: 'boohee-btn' });
        copyBtn.onclick = () => { navigator.clipboard.writeText(this.generateMarkdown()); new Notice('已复制'); };
        const sourceBtn = actions.createEl('button', { text: '🔎 查看来源', cls: 'boohee-btn' });
        sourceBtn.onclick = () => this.openSourceModal();
    }

    renderTable(container: HTMLElement, title: string, items: NutrientItem[], showSub = false) {
        if (!items?.length) return;
        const section = container.createDiv({ cls: 'boohee-section' });
        section.createEl('h5', { text: title });
        const table = section.createEl('table', { cls: 'boohee-table' });
        for (const item of items) {
            const row = table.createEl('tr');
            const label = item.name_en && item.name_en !== item.name
                ? `${item.name} / ${item.name_en}`
                : formatNutrientLabel(item.name);
            row.createEl('td', { text: label });
            row.createEl('td', { text: `${item.value} ${item.unit_name}`, cls: 'td-value' });
            if (showSub && item.items?.length) {
                for (const sub of item.items) {
                    const subRow = table.createEl('tr', { cls: 'sub-row' });
                    const subLabel = sub.name_en && sub.name_en !== sub.name
                        ? `${sub.name} / ${sub.name_en}`
                        : formatNutrientLabel(sub.name);
                    subRow.createEl('td', { text: '└ ' + subLabel });
                    subRow.createEl('td', { text: `${sub.value} ${sub.unit_name}`, cls: 'td-value' });
                }
            }
        }
    }

    generateMarkdown(): string {
        if (!this.currentDetail) return '';
        const d = this.currentDetail;
        let md = `## ${d.food.name}\n\n`;
        if (d.lights?.length) md += `> ✅ ${d.lights.join('、')}\n\n`;
        if (d.warnings?.length) md += `> ⚠️ ${d.warnings.join('、')}\n\n`;
        if (d.source === 'fooddata') md += `> 来源: FoodData Central (每100g)\n\n`;
        else md += `> 来源: 薄荷健康\n\n`;
        
        if (this.standardRows.length) {
            md += '### 标准营养表（目标清单）\n| 营养素 | 含量 | 单位 |\n|---|---|---|\n';
            for (const row of this.standardRows) {
                md += `| ${formatNutrientLabel(row.name)} | ${row.value} | ${row.unit} |\n`;
            }
            md += '\n';
        }
        
        // 热量
        md += '### 热量\n| 项目 | 数值 |\n|---|---|\n';
        for (const i of d.calory || []) {
            const label = i.name_en && i.name_en !== i.name ? `${i.name} / ${i.name_en}` : formatNutrientLabel(i.name);
            md += `| ${label} | ${i.value} ${i.unit_name} |\n`;
        }
        
        // 三大营养素
        md += '\n### 三大营养素\n| 营养素 | 含量 |\n|---|---|\n';
        for (const i of d.base_ingredients || []) {
            const label = i.name_en && i.name_en !== i.name ? `${i.name} / ${i.name_en}` : formatNutrientLabel(i.name);
            md += `| ${label} | ${i.value} ${i.unit_name} |\n`;
            if (i.items) for (const s of i.items) {
                const subLabel = s.name_en && s.name_en !== s.name ? `${s.name} / ${s.name_en}` : formatNutrientLabel(s.name);
                md += `| └ ${subLabel} | ${s.value} ${s.unit_name} |\n`;
            }
        }
        
        // 维生素
        const vitamins = d.vitamin?.filter(v => v.value > 0) || [];
        if (vitamins.length) {
            md += '\n### 维生素\n| 维生素 | 含量 |\n|---|---|\n';
            for (const v of vitamins) {
                const label = v.name_en && v.name_en !== v.name ? `${v.name} / ${v.name_en}` : formatNutrientLabel(v.name);
                md += `| ${label} | ${v.value} ${v.unit_name} |\n`;
            }
        }
        
        // 矿物质
        const minerals = d.mineral?.filter(m => m.value > 0) || [];
        if (minerals.length) {
            md += '\n### 矿物质\n| 矿物质 | 含量 |\n|---|---|\n';
            for (const m of minerals) {
                const label = m.name_en && m.name_en !== m.name ? `${m.name} / ${m.name_en}` : formatNutrientLabel(m.name);
                md += `| ${label} | ${m.value} ${m.unit_name} |\n`;
            }
        }
        
        // 氨基酸
        const aminoAcids = d.amino_acid?.filter(a => a.value > 0) || [];
        if (aminoAcids.length) {
            md += '\n### 氨基酸\n| 氨基酸 | 含量 |\n|---|---|\n';
            for (const a of aminoAcids) {
                const label = a.name_en && a.name_en !== a.name ? `${a.name} / ${a.name_en}` : formatNutrientLabel(a.name);
                md += `| ${label} | ${a.value} ${a.unit_name} |\n`;
            }
        }
        
        // 其他成分
        const others = d.other_ingredients?.filter(o => o.value > 0) || [];
        if (others.length) {
            md += '\n### 其他成分\n| 成分 | 含量 |\n|---|---|\n';
            for (const o of others) {
                const label = o.name_en && o.name_en !== o.name ? `${o.name} / ${o.name_en}` : formatNutrientLabel(o.name);
                md += `| ${label} | ${o.value} ${o.unit_name} |\n`;
            }
        }
        
        return md;
    }

    openSourceModal() {
        if (!this.currentDetail) return;
        const modal = new Modal(this.app);
        modal.titleEl.setText('引用数据来源');
        const body = modal.contentEl.createDiv({ cls: 'boohee-source-modal' });
        let payload: any = null;
        if (this.currentDetail.source === 'fooddata') {
            const meta = this.currentLocalFood?.m || {};
            payload = {
                name: this.currentDetail.food.name,
                sourceFile: meta.sourceFile,
                fdcId: meta.fdcId,
                dataType: meta.dataType,
                foodCategory: meta.foodCategory,
                nutrients: meta.nutrients || []
            };
        } else {
            payload = this.currentDetail;
        }
        const pre = body.createEl('pre', { text: JSON.stringify(payload, null, 2) });
        pre.addClass('boohee-source-pre');
        const btnRow = body.createDiv({ cls: 'boohee-source-actions' });
        const copyBtn = btnRow.createEl('button', { text: '复制 JSON', cls: 'boohee-btn' });
        copyBtn.onclick = () => { navigator.clipboard.writeText(pre.innerText); new Notice('已复制'); };
        modal.open();
    }

    insertToNote() {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            view.editor.replaceRange(this.generateMarkdown(), view.editor.getCursor());
            new Notice('已插入笔记');
        } else { new Notice('请先打开一个笔记'); }
    }

    async onClose() { }
}

// ============== 设置页面 ==============
class BooheeNutritionSettingTab extends PluginSettingTab {
    plugin: BooheeNutritionPlugin;

    constructor(app: App, plugin: BooheeNutritionPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: '超级营养计算器' });
        
        const info = containerEl.createDiv({ cls: 'boohee-setting-info' });
        info.innerHTML = '<p>请前往 <a href="https://fc.boohee.com">薄荷健康开放平台</a> 注册并获取 App ID 和 App Key</p>';

        new Setting(containerEl).setName('App ID').setDesc('开放平台 App ID')
            .addText(text => text.setPlaceholder('App ID').setValue(this.plugin.settings.appId)
                .onChange(async v => { this.plugin.settings.appId = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('App Key').setDesc('开放平台 App Key')
            .addText(text => { text.inputEl.type = 'password'; text.setPlaceholder('App Key').setValue(this.plugin.settings.appKey)
                .onChange(async v => { this.plugin.settings.appKey = v; await this.plugin.saveSettings(); }); });

        containerEl.createEl('h3', { text: 'FoodData Central 数据源（用于菜单计算器扩展数据库）' });
        new Setting(containerEl).setName('Foundation 数据路径')
            .setDesc('例如: /Users/liuqiang/Desktop/正式计算/FoodData_Central_foundation_food_json_2025-12-18.json')
            .addText(text => text.setPlaceholder('绝对路径').setValue(this.plugin.settings.foundationDataPath)
                .onChange(async v => {
                    this.plugin.settings.foundationDataPath = v;
                    await this.plugin.saveSettings();
                    this.plugin.foodDataLoader.invalidate();
                }));

        new Setting(containerEl).setName('SR Legacy 数据路径')
            .setDesc('例如: /Users/liuqiang/Desktop/正式计算/FoodData_Central_sr_legacy_food_json_2018-04.json')
            .addText(text => text.setPlaceholder('绝对路径').setValue(this.plugin.settings.legacyDataPath)
                .onChange(async v => {
                    this.plugin.settings.legacyDataPath = v;
                    await this.plugin.saveSettings();
                    this.plugin.foodDataLoader.invalidate();
                }));

        new Setting(containerEl).setName('数据库路径列表（优先级从上到下）')
            .setDesc('一行一个文件路径，可加入中国食物营养库等其它数据库')
            .addTextArea(area => area.setPlaceholder('/path/to/db.json\n/path/to/db2.json')
                .setValue((this.plugin.settings.dataPaths || []).join('\n'))
                .onChange(async v => {
                    this.plugin.settings.dataPaths = v.split('\n').map(s => s.trim()).filter(Boolean);
                    await this.plugin.saveSettings();
                    this.plugin.foodDataLoader.invalidate();
                }));

        containerEl.createEl('h3', { text: '营养覆盖排序' });
        new Setting(containerEl).setName('本地优先（无结果时使用薄荷）')
            .setDesc('优先使用本地数据库，查不到时再调用薄荷接口')
            .addToggle(toggle => toggle.setValue(this.plugin.settings.localFirst)
                .onChange(async v => { this.plugin.settings.localFirst = v; await this.plugin.saveSettings(); }));
        new Setting(containerEl).setName('目标营养素清单')
            .setDesc('一行一个标准营养素名称，用于覆盖率统计与筛选')
            .addTextArea(area => area.setPlaceholder(DEFAULT_TARGET_NUTRIENTS.join('\n'))
                .setValue((this.plugin.settings.targetNutrients || []).join('\n'))
                .onChange(async v => {
                    this.plugin.settings.targetNutrients = v.split('\n').map(s => s.trim()).filter(Boolean);
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl).setName('按覆盖率排序')
            .setDesc('搜索结果按营养覆盖数量从高到低排序')
            .addToggle(toggle => toggle.setValue(this.plugin.settings.sortByCoverage)
                .onChange(async v => { this.plugin.settings.sortByCoverage = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('最小覆盖数量')
            .setDesc('只显示覆盖数量不低于该值的食材，设为 0 表示不过滤')
            .addText(text => text.setPlaceholder('0')
                .setValue(String(this.plugin.settings.minCoverageCount || 0))
                .onChange(async v => {
                    const num = parseInt(v, 10);
                    this.plugin.settings.minCoverageCount = Number.isFinite(num) ? num : 0;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl).setName('薄荷覆盖计算上限')
            .setDesc('排序时最多拉取多少个薄荷详情用于覆盖率计算')
            .addText(text => text.setPlaceholder(String(DEFAULT_BOOHEE_COVERAGE_LIMIT))
                .setValue(String(this.plugin.settings.booheeCoverageFetchLimit || DEFAULT_BOOHEE_COVERAGE_LIMIT))
                .onChange(async v => {
                    const num = parseInt(v, 10);
                    this.plugin.settings.booheeCoverageFetchLimit = Number.isFinite(num) ? num : DEFAULT_BOOHEE_COVERAGE_LIMIT;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h3', { text: 'AI 映射（可选）' });
        new Setting(containerEl).setName('启用 AI 映射')
            .setDesc('用于将字段名称自动映射到目标营养素列表')
            .addToggle(toggle => toggle.setValue(this.plugin.settings.aiMappingEnabled)
                .onChange(async v => { this.plugin.settings.aiMappingEnabled = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('模型提供商')
            .setDesc('仅用于标注，例如: deepseek/openai/自建')
            .addText(text => text.setPlaceholder('openai-compatible')
                .setValue(this.plugin.settings.aiProvider || '')
                .onChange(async v => { this.plugin.settings.aiProvider = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('Base URL')
            .setDesc('OpenAI 兼容接口，例如: https://api.deepseek.com')
            .addText(text => text.setPlaceholder('https://api.deepseek.com')
                .setValue(this.plugin.settings.aiBaseUrl || '')
                .onChange(async v => { this.plugin.settings.aiBaseUrl = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('API Key')
            .setDesc('用于 AI 映射的密钥')
            .addText(text => { text.inputEl.type = 'password'; text.setPlaceholder('sk-***').setValue(this.plugin.settings.aiApiKey || '')
                .onChange(async v => { this.plugin.settings.aiApiKey = v; await this.plugin.saveSettings(); }); });

        new Setting(containerEl).setName('模型名称')
            .setDesc('例如: deepseek-chat / gpt-4o-mini 等')
            .addText(text => text.setPlaceholder('model-name')
                .setValue(this.plugin.settings.aiModel || '')
                .onChange(async v => { this.plugin.settings.aiModel = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('AI 映射提示词')
            .setDesc('建议保持 JSON 输出格式，便于解析')
            .addTextArea(area => area.setPlaceholder(DEFAULT_SETTINGS.aiPrompt)
                .setValue(this.plugin.settings.aiPrompt || DEFAULT_SETTINGS.aiPrompt)
                .onChange(async v => { this.plugin.settings.aiPrompt = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('启用 AI 食材名映射')
            .setDesc('将中文食材名映射为英文用于本地库检索')
            .addToggle(toggle => toggle.setValue(this.plugin.settings.aiFoodNameEnabled)
                .onChange(async v => { this.plugin.settings.aiFoodNameEnabled = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('AI 食材名提示词')
            .setDesc('仅输出 JSON: {"mapped":"..."}')
            .addTextArea(area => area.setPlaceholder(DEFAULT_SETTINGS.aiFoodNamePrompt)
                .setValue(this.plugin.settings.aiFoodNamePrompt || DEFAULT_SETTINGS.aiFoodNamePrompt)
                .onChange(async v => { this.plugin.settings.aiFoodNamePrompt = v; await this.plugin.saveSettings(); }));

        new Setting(containerEl).setName('清除 AI 映射缓存')
            .setDesc('用于重新生成映射结果')
            .addButton(btn => btn.setButtonText('清除').onClick(async () => {
                this.plugin.settings.aiMappingCache = {};
                await this.plugin.saveSettings();
                new Notice('已清除 AI 映射缓存');
            }));

        new Setting(containerEl).setName('清除 AI 食材名缓存')
            .setDesc('用于重新生成食材名映射结果')
            .addButton(btn => btn.setButtonText('清除').onClick(async () => {
                this.plugin.settings.aiFoodNameCache = {};
                await this.plugin.saveSettings();
                new Notice('已清除 AI 食材名缓存');
            }));

        new Setting(containerEl).setName('Token 状态')
            .setDesc(this.plugin.settings.accessToken ? `有效期至: ${this.plugin.settings.tokenExpiredAt}` : '未获取')
            .addButton(btn => btn.setButtonText('测试连接').onClick(async () => {
                try {
                    this.plugin.settings.accessToken = '';
                    await this.plugin.getAccessToken();
                    new Notice('连接成功');
                    this.display();
                } catch (e) { new Notice('连接失败: ' + e.message); }
            }))
            .addExtraButton(btn => btn.setIcon('refresh-cw').setTooltip('加载FoodData')
                .onClick(async () => {
                    try {
                        const foods = await this.plugin.foodDataLoader.getFoods();
                        const diag = this.plugin.foodDataLoader.getLastDiagnostics();
                        let msg = `FoodData 已加载 ${foods.length} 条记录`;
                        if (diag.errors.length) msg += `，警告: ${diag.errors[0]}`;
                        else if (diag.usedFallback) msg += '，使用内置小型库';
                        new Notice(msg);
                    } catch (e) {
                        new Notice('FoodData 加载失败: ' + e.message);
                    }
                }));
    }
}

// ============== 菜单计算视图 ==============
class MenuCalcView extends ItemView {
    plugin: BooheeNutritionPlugin;
    loader: FoodDataLoader;
    calculator = new MenuCalculator();
    textArea: HTMLTextAreaElement;
    resultArea: HTMLElement;
    popSelect: HTMLSelectElement;
    lastResult: { ingredients: MenuIngredient[]; total: NutritionResult; unmatched: string[]; driPop: string } | null = null;
    foodDataNoticeShown = false;

    constructor(leaf: WorkspaceLeaf, plugin: BooheeNutritionPlugin, loader: FoodDataLoader) {
        super(leaf);
        this.plugin = plugin;
        this.loader = loader;
    }

    getViewType() { return VIEW_TYPE_MENU_CALC; }
    getDisplayText() { return '菜单计算器'; }
    getIcon() { return 'calculator'; }

    async onOpen() {
        const container = this.contentEl;
        container.empty();
        container.addClass('menu-calc-panel');
        
        // 标题
        container.createEl('h3', { text: '🍽️ 菜单营养计算器' });
        
        // 说明
        container.createEl('p', { text: '输入食材和用量，每行一个，格式：食材名 用量g', cls: 'menu-calc-hint' });
        
        // 输入区
        this.textArea = container.createEl('textarea', {
            cls: 'menu-calc-input',
            attr: { placeholder: '鸡蛋 50g\n米饭 150g\n西红柿 100g', rows: '8' }
        });
        
        // 人群选择
        const popRow = container.createDiv({ cls: 'menu-calc-row' });
        popRow.createEl('span', { text: 'DRI参考人群: ' });
        this.popSelect = popRow.createEl('select', { cls: 'menu-calc-select' });
        for (const pop of Object.keys(DRIs)) {
            this.popSelect.createEl('option', { text: pop, value: pop });
        }
        
        // 按钮
        const btnRow = container.createDiv({ cls: 'menu-calc-btns' });
        const calcBtn = btnRow.createEl('button', { text: '计算', cls: 'boohee-btn boohee-btn-primary' });
        calcBtn.onclick = () => this.doCalculate();
        const insertBtn = btnRow.createEl('button', { text: '插入笔记', cls: 'boohee-btn' });
        insertBtn.onclick = () => this.insertToNote();
        
        // 结果区
        this.resultArea = container.createDiv({ cls: 'menu-calc-result' });
        this.resultArea.createEl('p', { text: '输入食材后点击计算', cls: 'menu-calc-placeholder' });
    }

    async doCalculate() {
        const text = this.textArea.value.trim();
        if (!text) { new Notice('请输入食材'); return; }
        this.resultArea.empty();
        this.resultArea.createEl('p', { text: '计算中...', cls: 'menu-calc-placeholder' });
        try {
            await this.loader.getFoods();
            const diag = this.loader.getLastDiagnostics();
            if (!this.foodDataNoticeShown) {
                if (diag.errors.length) {
                    this.foodDataNoticeShown = true;
                    new Notice(`FoodData 加载警告: ${diag.errors[0]}`);
                } else if (diag.usedFallback) {
                    this.foodDataNoticeShown = true;
                    new Notice('FoodData 未配置或加载失败，已使用内置小型库');
                }
            }
            const calcResult = await this.calculator.calculate(text, {
                loader: this.loader,
                boohee: this.plugin
            });
            const booheeError = this.calculator.getLastBooheeError();
            if (booheeError) new Notice(`薄荷 API 查询失败: ${booheeError}`);
            const pop = this.popSelect.value;
            const dri = this.calculator.compareDRIs(calcResult.total, pop);
            this.lastResult = { ...calcResult, driPop: pop };
            this.renderResult(calcResult.ingredients, calcResult.total, calcResult.unmatched, dri, pop);
        } catch (e) {
            this.resultArea.empty();
            this.resultArea.createEl('p', { text: '计算失败: ' + e.message, cls: 'text-red' });
        }
    }

    renderResult(ingredients: MenuIngredient[], total: NutritionResult, unmatched: string[], dri: Record<string, { value: number, dri: number, percent: number }>, pop: string) {
        this.resultArea.empty();
        
        // 食材匹配结果
        const ingSection = this.resultArea.createDiv({ cls: 'menu-calc-section' });
        ingSection.createEl('h4', { text: '食材匹配' });
        const ingTable = ingSection.createEl('table', { cls: 'boohee-table' });
        for (const ing of ingredients) {
            const row = ingTable.createEl('tr');
            row.createEl('td', { text: ing.name });
            row.createEl('td', { text: `${ing.amount}g` });
            // 数据源选择单元格
            const matchCell = row.createEl('td', { cls: 'menu-match-cell' });
            if (ing.matched) {
                matchCell.createEl('span', { 
                    text: `${ing.matched}${ing.source ? ` (${ing.source})` : ''}`,
                    cls: 'menu-match-text'
                });
                // 添加数据源选择按钮
                const sourceBtn = matchCell.createEl('button', { text: '▼', cls: 'menu-source-btn' });
                sourceBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.showIngredientSourceSelector(ing, sourceBtn);
                };
                const searchBtn = matchCell.createEl('button', { text: '手动查找', cls: 'menu-source-btn menu-source-btn-search' });
                searchBtn.onclick = async (e) => {
                    e.stopPropagation();
                    await this.openIngredientSearch(ing);
                };
            } else {
                matchCell.createEl('span', { text: '❌ 未匹配', cls: 'text-red' });
                // 未匹配的也可以选择数据源
                const sourceBtn = matchCell.createEl('button', { text: '选择', cls: 'menu-source-btn menu-source-btn-select' });
                sourceBtn.onclick = (e) => {
                    e.stopPropagation();
                    this.showIngredientSourceSelector(ing, sourceBtn);
                };
                const searchBtn = matchCell.createEl('button', { text: '手动查找', cls: 'menu-source-btn menu-source-btn-search' });
                searchBtn.onclick = async (e) => {
                    e.stopPropagation();
                    await this.openIngredientSearch(ing);
                };
            }
        }
        if (unmatched.length) {
            ingSection.createEl('p', { text: `⚠️ 未匹配: ${unmatched.join(', ')}`, cls: 'text-warning' });
        }
        
        // 营养汇总
        const nutSection = this.resultArea.createDiv({ cls: 'menu-calc-section' });
        const nutHeader = nutSection.createDiv({ cls: 'menu-calc-header' });
        nutHeader.createEl('h4', { text: `营养汇总 (DRI: ${pop})` });
        const copyBtn = nutHeader.createEl('button', { text: '复制表格', cls: 'boohee-btn' });
        copyBtn.onclick = () => {
            const tableText = this.buildNutritionSummaryTable(dri);
            navigator.clipboard.writeText(tableText);
            new Notice('已复制');
        };
        const nutTable = nutSection.createEl('table', { cls: 'boohee-table' });
        const header = nutTable.createEl('tr');
        header.createEl('th', { text: '营养素' });
        header.createEl('th', { text: '含量' });
        header.createEl('th', { text: 'DRI%' });
        
        for (const [name, data] of Object.entries(dri)) {
            const row = nutTable.createEl('tr');
            row.createEl('td', { text: formatNutrientLabel(name) });
            const unit = NUTRIENT_UNITS[name] || '';
            row.createEl('td', { text: unit ? `${data.value} ${unit}` : `${data.value}` });
            const pctCell = row.createEl('td', { text: `${data.percent}%` });
            if (data.percent >= 100) pctCell.addClass('text-green');
            else if (data.percent >= 50) pctCell.addClass('text-yellow');
            else pctCell.addClass('text-red');
        }
    }

    private buildNutritionSummaryTable(dri: Record<string, { value: number, dri: number, percent: number }>) {
        let md = '| 营养素 | 含量 | DRI% |\n|---|---|---|\n';
        for (const [name, data] of Object.entries(dri)) {
            const unit = NUTRIENT_UNITS[name] || '';
            const value = unit ? `${data.value} ${unit}` : `${data.value}`;
            md += `| ${formatNutrientLabel(name)} | ${value} | ${data.percent}% |\n`;
        }
        return md;
    }

    insertToNote() {
        if (!this.lastResult) { new Notice('请先计算'); return; }
        const md = this.calculator.toMarkdown(this.lastResult.total, this.lastResult.ingredients, this.lastResult.unmatched, this.lastResult.driPop);
        
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            view.editor.replaceRange(md, view.editor.getCursor());
            new Notice('已插入笔记');
        } else { new Notice('请先打开一个笔记'); }
    }

    private showIngredientSourceSelector(ing: MenuIngredient, anchorEl: HTMLElement) {
        // 移除已有的选择器
        document.querySelectorAll('.boohee-source-dropdown').forEach(el => el.remove());
        
        const dropdown = document.createElement('div');
        dropdown.className = 'boohee-source-dropdown';
        
        // 数据源选项
        const sources = [
            { type: 'boohee', name: '薄荷健康', icon: '🥗', desc: '中国食物数据' },
            { type: 'boohee_brand', name: '薄荷品牌', icon: '🏷️', desc: '品牌食品数据' },
            { type: 'boohee_restaurant', name: '薄荷餐厅', icon: '🍜', desc: '餐厅菜品数据' },
            { type: 'china', name: '中国食物营养库', icon: '🇨🇳', desc: '内置中国食物库' },
            { type: 'usda', name: 'USDA FoodData', icon: '🇺🇸', desc: '美国农业部数据' },
        ];
        
        // 标记当前数据源
        if (ing.source === 'fooddata') {
            sources[4].desc = '美国农业部数据 ✓';
        } else if (ing.source === 'boohee') {
            sources[0].desc = '中国食物数据 ✓';
        } else if (ing.source === 'china') {
            sources[3].desc = '内置中国食物库 ✓';
        }
        
        for (const src of sources) {
            const option = dropdown.createDiv({ cls: 'boohee-source-option' });
            option.innerHTML = `<span class="source-icon">${src.icon}</span><span class="source-name">${src.name}</span><span class="source-desc">${src.desc}</span>`;
            option.onclick = async (e) => {
                e.stopPropagation();
                dropdown.remove();
                await this.rematchIngredientWithSource(ing, src.type);
            };
        }
        
        // 定位下拉菜单
        const rect = anchorEl.getBoundingClientRect();
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.right = `${window.innerWidth - rect.right}px`;
        document.body.appendChild(dropdown);
        
        // 点击其他地方关闭
        const closeHandler = (e: MouseEvent) => {
            if (!dropdown.contains(e.target as Node)) {
                dropdown.remove();
                document.removeEventListener('click', closeHandler);
            }
        };
        setTimeout(() => document.addEventListener('click', closeHandler), 0);
    }

    private async rematchIngredientWithSource(ing: MenuIngredient, sourceType: string) {
        new Notice(`正在从 ${this.getSourceName(sourceType)} 匹配 "${ing.name}"...`);
        try {
            if (sourceType === 'china') {
                const foods = await this.loader.getFoods();
                const chinaFoods = foods.filter(f => f.m?.dataType === 'China_Embedded');
                const result = await this.calculator.matchSingleIngredient(ing.name, chinaFoods);
                if (result) {
                    ing.matched = result.matched;
                    ing.source = 'china';
                    ing.nutrients = result.nutrients;
                    new Notice(`已匹配: ${result.matched}`);
                } else {
                    new Notice('中国食物库中未找到该食材');
                }
            } else if (sourceType === 'usda') {
                // 从 USDA/FoodData 匹配
                const foods = await this.loader.getFoods();
                const usdaFoods = foods.filter(f => f.m?.dataType !== 'China_Embedded');
                const result = await this.calculator.matchSingleIngredient(ing.name, usdaFoods);
                if (result) {
                    ing.matched = result.matched;
                    ing.source = 'fooddata';
                    ing.nutrients = result.nutrients;
                    new Notice(`已匹配: ${result.matched}`);
                } else {
                    new Notice('USDA 数据库中未找到该食材');
                }
            } else if (sourceType.startsWith('boohee')) {
                // 从薄荷匹配
                const searchType = sourceType === 'boohee_brand' ? 'brand' : 
                                   sourceType === 'boohee_restaurant' ? 'restaurant' : 'all';
                const results = await this.plugin.searchFood(ing.name, searchType);
                if (results.foods?.length > 0) {
                    const detail = await this.plugin.getFoodDetail(results.foods[0].code);
                    ing.matched = results.foods[0].name;
                    ing.source = 'boohee';
                    // 提取营养数据
                    ing.nutrients = this.extractBooheeNutrients(detail);
                    new Notice(`已匹配: ${results.foods[0].name}`);
                } else {
                    new Notice(`薄荷 ${this.getSourceName(sourceType)} 中未找到该食材`);
                }
            }
            // 重新计算并渲染
            if (this.lastResult) {
                const pop = this.popSelect.value;
                const total = this.calculator.sumNutrients(this.lastResult.ingredients);
                const dri = this.calculator.compareDRIs(total, pop);
                this.lastResult.total = total;
                this.renderResult(this.lastResult.ingredients, total, this.lastResult.unmatched, dri, pop);
            }
        } catch (error) {
            new Notice(`匹配失败: ${error.message}`);
        }
    }

    private async openIngredientSearch(ing: MenuIngredient) {
        const foods = await this.loader.getFoods();
        const modal = new Modal(this.app);
        modal.titleEl.setText(`手动匹配: ${ing.name}`);
        const body = modal.contentEl;
        body.addClass('menu-search-modal');
        const input = body.createEl('input', { type: 'text', cls: 'menu-search-input' });
        input.value = ing.matched || ing.name;
        const list = body.createDiv({ cls: 'menu-search-list' });

        const render = () => {
            list.empty();
            const q = input.value.trim().toLowerCase();
            if (!q) {
                list.createDiv({ cls: 'menu-search-empty', text: '输入关键词以搜索本地数据库' });
                return;
            }
            const results = foods
                .map((food) => {
                    const name = (food.n || '').toLowerCase();
                    if (!name.includes(q)) return null;
                    let score = 1;
                    if (name === q) score = 3;
                    else if (name.startsWith(q)) score = 2;
                    return { food, score };
                })
                .filter(Boolean) as { food: USDAFood; score: number }[];
            results.sort((a, b) => (b.score - a.score) || (a.food.n.length - b.food.n.length));
            const sliced = results.slice(0, 50);
            if (!sliced.length) {
                list.createDiv({ cls: 'menu-search-empty', text: '未找到匹配项' });
                return;
            }
            for (const item of sliced) {
                const food = item.food;
                const row = list.createDiv({ cls: 'menu-search-item' });
                row.createEl('span', { text: food.n, cls: 'menu-search-name' });
                const sourceLabel = food.m?.dataType === 'China_Embedded' ? '中国库' : 'USDA';
                row.createEl('span', { text: sourceLabel, cls: 'menu-search-meta' });
                row.onclick = () => {
                    ing.matched = food.n;
                    ing.nutrients = food.d;
                    ing.source = food.m?.dataType === 'China_Embedded' ? 'china' : 'fooddata';
                    if (this.lastResult) {
                        const pop = this.popSelect.value;
                        const total = this.calculator.sumNutrients(this.lastResult.ingredients);
                        const dri = this.calculator.compareDRIs(total, pop);
                        this.lastResult.total = total;
                        this.lastResult.unmatched = this.lastResult.ingredients.filter(i => !i.matched).map(i => i.name);
                        this.renderResult(this.lastResult.ingredients, total, this.lastResult.unmatched, dri, pop);
                    }
                    modal.close();
                };
            }
        };

        input.addEventListener('input', render);
        render();
        modal.open();
    }

    private extractBooheeNutrients(detail: any): Record<string, number> {
        const nutrients: Record<string, number> = {};
        const items = [
            ...(detail.calory || []),
            ...(detail.base_ingredients || []),
            ...(detail.vitamin || []),
            ...(detail.mineral || []),
            ...(detail.other_ingredients || []),
            ...(detail.amino_acid || [])
        ];
        for (const item of items) {
            if (item?.name && typeof item.value === 'number') {
                nutrients[item.name] = item.value;
            }
            if (item?.items) {
                for (const sub of item.items) {
                    if (sub?.name && typeof sub.value === 'number') {
                        nutrients[sub.name] = sub.value;
                    }
                }
            }
        }
        return nutrients;
    }

    private getSourceName(sourceType: string): string {
        const names: Record<string, string> = {
            'boohee': '薄荷健康',
            'boohee_brand': '薄荷品牌',
            'boohee_restaurant': '薄荷餐厅',
            'china': '中国食物营养库',
            'usda': 'USDA FoodData'
        };
        return names[sourceType] || sourceType;
    }

    async onClose() { }
}
