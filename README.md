# Super Nutrition Calculator

Super Nutrition Calculator is a multi-source nutrition analysis plugin for food, ingredients, and meal formulas. It combines Boohee, USDA FoodData Central, Chinese food composition data, and local nutrition datasets to support food lookup, meal nutrition calculation, 30+ nutrient DRI comparison, and Markdown insertion.

## Features

- Multi-source nutrition lookup from Boohee, Boohee restaurant foods, USDA FoodData Central, Chinese food composition data, and embedded local datasets.
- Meal and menu nutrition calculation from ingredient names and gram weights.
- 30+ nutrient DRI comparison for different reference groups such as adult men, adult women, pregnant women, and older adults.
- Configurable local database paths for FoodData Central Foundation, SR Legacy, Chinese nutrition data, and compatible custom datasets.
- Nutrition coverage sorting to prioritize records with more complete nutrient data.
- Optional OpenAI-compatible AI mapping for nutrient field normalization and Chinese ingredient name standardization.
- Manual ingredient rematching and source switching during meal calculation.
- Markdown insertion for food details, meal summaries, and DRI comparison tables.

## 中文说明

# 超级营养计算器

一个面向食物、食材和餐品配方的营养分析插件。它整合薄荷健康、USDA FoodData Central、中国食物营养数据和本地扩展数据库，支持单个食物查询、餐品营养汇总、30+ 项营养素 DRI 对比，以及将结果插入笔记。

相比单纯的薄荷健康查询工具，本插件更适合用于餐品研发、膳食记录、营养核算和不同数据源之间的营养字段对照。

## 核心功能

- **多数据源营养查询**：支持薄荷健康食物数据、薄荷餐厅菜品数据、USDA FoodData Central、中国食物营养库和内置本地数据。
- **餐品/菜单营养计算**：输入多行食材和克重，自动匹配数据源并按实际用量汇总营养素。
- **30+ 项 DRI 对比**：按成年男性、成年女性、孕妇、老年人等参考人群，对能量、三大营养素、膳食纤维、胆固醇、维生素和矿物质等指标计算 DRI%。
- **USDA 与中国食物库支持**：可加载 FoodData Central Foundation、SR Legacy、中国食物营养库，以及自定义数据库路径。
- **营养覆盖排序**：按目标营养素覆盖数量排序和筛选，优先选择信息更完整的食材记录。
- **AI 辅助映射**：可用 OpenAI-compatible 接口辅助营养字段映射和中文食材英文标准化，提升跨数据库匹配质量。
- **手动匹配与来源切换**：餐品计算中可为单个食材切换薄荷健康、薄荷餐厅、中国食物库或 USDA 数据源。
- **结果插入笔记**：将食物详情、餐品营养汇总和 DRI 对比表以 Markdown 形式写入当前笔记。

## 安装方法

### 手动安装

1. 下载本插件的 `main.js`、`manifest.json` 和 `styles.css` 文件。
2. 在你的库中创建第三方插件文件夹。
3. 将下载的文件复制到该文件夹。
4. 重启应用。
5. 在设置 -> 第三方插件中启用“超级营养计算器”。

### 从源码构建

```bash
cd <源码目录>
npm install
npm run build
```

## 配置说明

### 薄荷健康 API

1. 前往 [薄荷健康开放平台](https://fc.boohee.com) 注册开发者账号。
2. 创建应用获取 `App ID` 和 `App Key`。
3. 在插件设置 -> 超级营养计算器 中填入凭证。

### 本地营养数据库

插件支持配置以下数据源路径：

- FoodData Central Foundation JSON
- FoodData Central SR Legacy JSON
- 中国食物营养库或其它兼容格式数据文件
- 多个自定义数据库路径，按优先级从上到下加载

未配置外部数据库时，插件会使用内置小型数据集作为兜底。

### 目标营养素与 DRI

默认目标清单覆盖 30+ 项常用营养指标，包括：

- 能量、蛋白质、脂肪、碳水化合物、膳食纤维、胆固醇
- 维生素 A、D、E、K、B1、B2、B6、B12、C、泛酸、叶酸、烟酸、生物素
- 钙、磷、钾、钠、镁、氯、铁、碘、锌、硒、铜、锰、胆碱

## 使用方法

### 食物营养查询

1. 点击左侧边栏的苹果图标，或在命令面板执行“打开营养查询面板”。
2. 输入食物、食材或菜品关键词。
3. 在结果中选择薄荷健康、薄荷餐厅、USDA FoodData 或本地中国食物库来源。
4. 查看营养详情，并可一键插入当前笔记。

### 餐品营养计算

1. 点击左侧边栏的计算器图标，或在命令面板执行“打开菜单营养计算器”。
2. 按每行一个食材输入，格式为：`食材名 用量g`。
3. 选择 DRI 参考人群。
4. 点击“计算”，查看食材匹配、营养汇总和 DRI%。
5. 如匹配不准确，可对单个食材手动查找或切换数据源。

示例：

```text
鸡蛋 50g
米饭 150g
西红柿 100g
玉米油 10g
```

## 输出示例

```markdown
## 营养计算结果

### 食材
| 食材 | 用量 | 匹配 |
|---|---|---|
| 鸡蛋 | 50g | Egg, whole, cooked (fooddata) |
| 米饭 | 150g | Rice, white, cooked (fooddata) |

### 营养汇总
| 营养素 | 含量 | DRI% |
|---|---|---|
| 能量 / Energy | 245 kcal | 11% |
| 蛋白质 / Protein | 10.8 g | 17% |
| 钙 / Calcium, Ca | 72 mg | 9% |
```

## 数据源说明

本插件可使用以下数据来源：

- 薄荷健康开放平台：`https://fc.boohee.com`
- USDA FoodData Central
- 中国食物营养数据
- 插件内置和用户自定义本地数据库

不同数据源的字段名称、单位和覆盖程度可能不同。插件会通过标准营养素清单、覆盖率统计和可选 AI 映射尽量统一展示，但结果仍建议用于记录、研发和参考性分析，不应替代专业营养或医疗建议。

## 许可证

MIT License
