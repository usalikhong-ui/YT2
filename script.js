import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// [修正] 新增中央本地化對應表 (Sec 3.4)
const LOCALIZATION_MAP = {
    stats: {
        hp: '生命', mp: '法力', atk: '攻擊', def: '防禦',
        spi: '靈力', hit: '命中', eva: '閃避',
        critRate: '暴擊率', critDamage: '暴傷', speed: '速度'
    },
    ui: {
        confirm: '確認', cancel: '取消', back: '返回',
        equipped: '已裝備', learn: '學習', upgrade: '升級'
    }
};

// --- 遊戲資料庫 ---
const DATABASE = {
    classes: {
        swordsman: { name: "劍客", description: "戰場中的戰士，有優秀的防禦與物理攻擊能力。", stats: { hp: 90, mp: 35, atk: 16, def: 13, spi: 5, hit: 10, eva: 8, critRate: 5, critDamage: 150, speed: 10 }, story: "你是舊帝國破碎軍團的繼承者，背負著先祖失落的榮耀。", skills: { slash: 1 }, icon: `<svg class="class-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.71,6.29,17.71,2.29a1,1,0,0,0-1.42,0L3.29,15.29a1,1,0,0,0,0,1.42l4,4a1,1,0,0,0,1.42,0L21.71,7.71A1,1,0,0,0,21.71,6.29ZM6.41,18.83l-1-1L15.59,7.71l1,1ZM8,14H4V11a1,1,0,0,0-2,0v4a1,1,0,0,0,1,1H7a1,1,0,0,0,0-2Zm12.17-9.17-1,1L9.41,5.17l1-1,8.76,8.76Z"/></svg>` },
        monk: { name: "修士", description: "天生的靈力者，能夠巧妙使用魔法來攻擊或附魔。", stats: { hp: 70, mp: 85, atk: 9, def: 9, spi: 19, hit: 12, eva: 10, critRate: 5, critDamage: 150, speed: 12 }, story: "你來自一個古老的修道院，尋求修復世界創傷、對抗混沌顯化的方法。", skills: { spiritualPalm: 1 }, icon: `<svg class="class-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M11,4a8,8,0,0,0-8,8,8,8,0,0,0,8,8,7.91,7.91,0,0,0,3.34-.73l.25,1.5a1,1,0,0,0,1,.87,1,1,0,0,0,1-.87l-.25-1.5A7.91,7.91,0,0,0,20,12a8,8,0,0,0-8-8Zm0,14a6,6,0,0,1-6-6,6,6,0,0,1,6-6,6,6,0,0,1,6,6,6,6,0,0,1-6,6Zm-3-6a3,3,0,1,1,3,3A3,3,0,0,1,8,12Zm3,1a1,1,0,1,0-1-1A1,1,0,0,0,11,13Z"/></svg>` },
        orc: { name: "獸人", description: "超級人類，有超越人類的姿態，但對魔法抵抗力較低。", stats: { hp: 130, mp: 25, atk: 19, def: 16, spi: 3, hit: 8, eva: 5, critRate: 5, critDamage: 150, speed: 8 }, story: "你生於文明邊緣的洪荒部落，決心用原始的力量對抗扭曲的現實。", skills: { savageCleave: 1 }, icon: `<svg class="class-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21.89,14.28l-3.32,2.43a1,1,0,0,1-1.18,0L14,14.49V4.09a1,1,0,0,0-1-1,1,1,0,0,0-1,1v5.3L10.2,7.74a1,1,0,0,0-1.2,0L2,14.34V20a1,1,0,0,0,1,1H21a1,1,0,0,0,1-1V15.71A1,1,0,0,0,21.89,14.28ZM12.59,9.45,14,10.63v1.89l-1.41-1.04Zm-3,0,1.41,1.18v1.89L9.59,11.37ZM4,18.43v-3l4.79-3.52,1.21.9V18H4Zm7,0V13.7l.59.43.59-.43V18H11Zm7,0h-5V12.81l1.21-.9L19,15.43v3Z"/></svg>` },
        necromancer: { name: "死靈", description: "沒有實體，但對魔法有超高抵抗，能利用法術傷害敵人並汲取生命。", stats: { hp: 60, mp: 110, atk: 6, def: 6, spi: 26, hit: 11, eva: 15, critRate: 5, critDamage: 150, speed: 15 }, story: "世人誤解你為邪惡，但你只是個探求生命與死亡「迴響」的學者。", skills: { boneSpear: 1 }, icon: `<svg class="class-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12,2A10,10,0,0,0,2,12a10,10,0,0,0,10,10,10,10,0,0,0,10-10A10,10,0,0,0,12,2Zm0,18a8,8,0,0,1-8-8,8,8,0,0,1,8-8,8,8,0,0,1,8,8,8,8,0,0,1-8,8Zm-2.5-5.5A1.5,1.5,0,1,0,8,13,1.5,1.5,0,0,0,9.5,14.5Zm5,0A1.5,1.5,0,1,0,16,13,1.5,1.5,0,0,0,14.5,14.5ZM12,6a1,1,0,0,0-1,1v3.13a2,2,0,0,0,4,0V7a1,1,0,0,0-1-1H12Z"/></svg>` }
    },
    monsters: {
        // [修正][問題14] 調整怪物強度，使低級時難度更平滑
        // Level 1-5
        slime: { id: 'slime', name: "史萊姆", level: 1, stats: { hp: 30, mp: 0, atk: 10, def: 8, spi: 2, hit: 5, eva: 3, speed: 7, critRate: 0, critDamage: 100 }, exp: 15, dropsId: 'L001', skills: []},
        goblin: { id: 'goblin', name: "哥布林", level: 2, stats: { hp: 55, mp: 5, atk: 15, def: 10, spi: 5, hit: 7, eva: 8, speed: 12, critRate: 5, critDamage: 120 }, exp: 30, dropsId: 'L002', skills: ['goblinRush']},
        forestSpider: { id: 'forestSpider', name: '森林蜘蛛', level: 3, stats: { hp: 60, mp: 0, atk: 22, def: 8, spi: 0, hit: 10, eva: 12, speed: 18, critRate: 5, critDamage: 120 }, exp: 40, dropsId: 'L003', skills: ['poisonBite']},
        wildBoar: { id: 'wildBoar', name: "野豬", level: 3, stats: { hp: 100, mp: 0, atk: 22, def: 15, spi: 0, hit: 6, eva: 5, speed: 10, critRate: 5, critDamage: 130 }, exp: 50, dropsId: 'L004', skills: ['tuskGore']},
        wolf: { id: 'wolf', name: '野狼', level: 4, stats: { hp: 80, mp: 0, atk: 28, def: 12, spi: 3, hit: 12, eva: 15, speed: 20, critRate: 10, critDamage: 130 }, exp: 65, dropsId: 'L005', skills: ['furiousBite']},
        goblinWarrior: { id: 'goblinWarrior', name: '哥布林戰士', level: 5, stats: { hp: 120, mp: 10, atk: 30, def: 18, spi: 8, hit: 9, eva: 8, speed: 12, critRate: 8, critDamage: 130 }, exp: 75, dropsId: 'L006', skills: ['goblinRush']},
        orcGrunt: { id: 'orcGrunt', name: '獸人步兵', level: 6, stats: { hp: 160, mp: 0, atk: 38, def: 22, spi: 5, hit: 8, eva: 5, speed: 10, critRate: 5, critDamage: 140 }, exp: 95, dropsId: 'L007', skills: []},
        // Level 6-10
        hobgoblin: { id: 'hobgoblin', name: '大哥布林', level: 7, stats: { hp: 200, mp: 20, atk: 42, def: 25, spi: 10, hit: 10, eva: 10, speed: 14, critRate: 10, critDamage: 140 }, exp: 120, dropsId: 'L008', skills: ['hobgoblinSmash']},
        orcShaman: { id: 'orcShaman', name: '獸人薩滿', level: 8, stats: { hp: 150, mp: 60, atk: 28, def: 18, spi: 35, hit: 12, eva: 12, speed: 15, critRate: 5, critDamage: 120 }, exp: 150, dropsId: 'L009', skills: ['shamanCurse', 'minorHeal']},
        skeleton: { id: 'skeleton', name: '骷髏兵', level: 8, stats: { hp: 220, mp: 0, atk: 48, def: 30, spi: 0, hit: 11, eva: 8, speed: 13, critRate: 5, critDamage: 120 }, exp: 170, dropsId: 'L010', skills: [] },
        wraith: { id: 'wraith', name: '怨靈', level: 9, stats: { hp: 180, mp: 80, atk: 38, def: 25, spi: 45, hit: 15, eva: 20, speed: 22, critRate: 5, critDamage: 120 }, exp: 210, dropsId: 'L011', skills: ['shadowBlast'] },
        direWolf: { id: 'direWolf', name: '恐狼', level: 10, stats: { hp: 250, mp: 0, atk: 58, def: 28, spi: 5, hit: 14, eva: 18, speed: 25, critRate: 15, critDamage: 140 }, exp: 240, dropsId: 'L012', skills: ['furiousBite'] },
        // Level 11-15
        golem: { id: 'golem', name: '石巨人', level: 12, stats: { hp: 320, mp: 0, atk: 65, def: 50, spi: 0, hit: 10, eva: 2, speed: 8, critRate: 0, critDamage: 150 }, exp: 300, dropsId: 'L013', skills: ['earthSlam']},
        harpy: { id: 'harpy', name: '鷹身女妖', level: 13, stats: { hp: 240, mp: 40, atk: 55, def: 25, spi: 30, hit: 18, eva: 25, speed: 30, critRate: 10, critDamage: 130 }, exp: 350, dropsId: 'L014', skills: ['wingSlash']},
        ogre: { id: 'ogre', name: '食人魔', level: 15, stats: { hp: 450, mp: 0, atk: 80, def: 40, spi: 10, hit: 9, eva: 6, speed: 12, critRate: 10, critDamage: 160 }, exp: 420, dropsId: 'L015', skills: ['ogreClub']},
        // Level 16-20
        lizardman: { id: 'lizardman', name: '蜥蜴人', level: 16, stats: { hp: 350, mp: 20, atk: 70, def: 35, spi: 20, hit: 15, eva: 15, speed: 20, critRate: 10, critDamage: 140 }, exp: 480, dropsId: 'L016', skills: []},
        manticore: { id: 'manticore', name: '獅蠍', level: 18, stats: { hp: 480, mp: 50, atk: 85, def: 40, spi: 30, hit: 16, eva: 20, speed: 28, critRate: 15, critDamage: 150 }, exp: 580, dropsId: 'L017', skills: ['poisonSting', 'wingSlash']},
        troll: { id: 'troll', name: '巨魔', level: 20, stats: { hp: 650, mp: 0, atk: 95, def: 50, spi: 5, hit: 12, eva: 10, speed: 15, critRate: 5, critDamage: 150 }, exp: 750, dropsId: 'L018', skills: ['trollRegen']},
        // Level 21-25
        minotaur: { id: 'minotaur', name: '牛頭人', level: 22, stats: { hp: 750, mp: 30, atk: 115, def: 60, spi: 15, hit: 14, eva: 12, speed: 18, critRate: 10, critDamage: 170 }, exp: 900, dropsId: 'L019', skills: ['charge']},
        wyvern: { id: 'wyvern', name: '雙足飛龍', level: 25, stats: { hp: 850, mp: 100, atk: 125, def: 55, spi: 50, hit: 18, eva: 22, speed: 35, critRate: 10, critDamage: 150 }, exp: 1200, dropsId: 'L020', skills: ['fireBreath']},
        elemental: { id: 'elemental', name: '元素體', level: 26, stats: { hp: 550, mp: 200, atk: 85, def: 50, spi: 100, hit: 20, eva: 20, speed: 25, critRate: 5, critDamage: 150 }, exp: 1300, dropsId: 'L021', skills: ['elementalBlast']},
        basilisk: { id: 'basilisk', name: '石化蜥蜴', level: 28, stats: { hp: 700, mp: 80, atk: 105, def: 70, spi: 40, hit: 15, eva: 15, speed: 20, critRate: 5, critDamage: 150 }, exp: 1500, dropsId: 'L022', skills: ['petrifyingGaze']},
        chimera: { id: 'chimera', name: '奇美拉', level: 30, stats: { hp: 1100, mp: 150, atk: 135, def: 65, spi: 60, hit: 17, eva: 18, speed: 32, critRate: 15, critDamage: 160 }, exp: 1900, dropsId: 'L023', skills: ['fireBreath', 'poisonBite']},
        dullahan: { id: 'dullahan', name: '無頭騎士', level: 32, stats: { hp: 950, mp: 100, atk: 145, def: 80, spi: 50, hit: 22, eva: 20, speed: 38, critRate: 15, critDamage: 160 }, exp: 2300, dropsId: 'L024', skills: ['charge']},
        behemoth: { id: 'behemoth', name: '貝西摩斯', level: 35, stats: { hp: 1600, mp: 50, atk: 165, def: 100, spi: 20, hit: 15, eva: 10, speed: 20, critRate: 5, critDamage: 180 }, exp: 3200, dropsId: 'L025', skills: ['earthSlam']},
        roc: { id: 'roc', name: '大鵬鳥', level: 36, stats: { hp: 1300, mp: 120, atk: 145, def: 70, spi: 60, hit: 25, eva: 30, speed: 45, critRate: 10, critDamage: 150 }, exp: 3700, dropsId: 'L026', skills: ['wingSlash']},
        hydra: { id: 'hydra', name: '九頭蛇', level: 38, stats: { hp: 1900, mp: 200, atk: 155, def: 80, spi: 70, hit: 18, eva: 15, speed: 25, critRate: 10, critDamage: 160 }, exp: 4500, dropsId: 'L027', skills: ['multiBite', 'trollRegen']},
        lich: { id: 'lich', name: '巫妖', level: 40, stats: { hp: 1600, mp: 500, atk: 105, def: 90, spi: 180, hit: 20, eva: 25, speed: 30, critRate: 10, critDamage: 150 }, exp: 5300, dropsId: 'L028', skills: ['shadowBlast', 'lifeDrain']},
        ironGolem: { id: 'ironGolem', name: '鋼鐵魔像', level: 42, stats: { hp: 2600, mp: 0, atk: 185, def: 150, spi: 10, hit: 16, eva: 5, speed: 15, critRate: 0, critDamage: 180 }, exp: 6100, dropsId: 'L029', skills: ['earthSlam']},
        abyssWatcher: { id: 'abyssWatcher', name: '深淵監視者', level: 44, stats: { hp: 2100, mp: 200, atk: 205, def: 100, spi: 100, hit: 28, eva: 35, speed: 50, critRate: 20, critDamage: 170 }, exp: 7200, dropsId: 'L030', skills: ['charge']},
        cerberus: { id: 'cerberus', name: '地獄三頭犬', level: 45, stats: { hp: 2300, mp: 150, atk: 195, def: 90, spi: 80, hit: 24, eva: 28, speed: 42, critRate: 15, critDamage: 160 }, exp: 8000, dropsId: 'L031', skills: ['multiBite', 'fireBreath']},
        ancientDragon: { id: 'ancientDragon', name: '遠古巨龍', level: 50, stats: { hp: 5500, mp: 800, atk: 260, def: 180, spi: 150, hit: 30, eva: 20, speed: 40, critRate: 10, critDamage: 200 }, exp: 16000, dropsId: 'L032', skills: ['fireBreath', 'earthSlam']},
        hauntedArmor: { id: 'hauntedArmor', name: "被詛咒的盔甲", level: 11, stats: { hp: 280, mp: 0, atk: 55, def: 40, spi: 10, hit: 12, eva: 10, speed: 12, critRate: 5, critDamage: 120 }, exp: 260, dropsId: 'L010', skills: [] },
        gargoyle: { id: 'gargoyle', name: "石像鬼", level: 14, stats: { hp: 310, mp: 30, atk: 60, def: 60, spi: 20, hit: 13, eva: 15, speed: 25, critRate: 5, critDamage: 130 }, exp: 380, dropsId: 'L013', skills: [] },
        banshee: { id: 'banshee', name: "報喪女妖", level: 17, stats: { hp: 280, mp: 100, atk: 45, def: 30, spi: 70, hit: 18, eva: 22, speed: 28, critRate: 5, critDamage: 130 }, exp: 530, dropsId: 'L011', skills: ['shadowBlast'] },
        cockatrice: { id: 'cockatrice', name: "雞蛇", level: 19, stats: { hp: 380, mp: 50, atk: 75, def: 45, spi: 30, hit: 16, eva: 25, speed: 30, critRate: 10, critDamage: 140 }, exp: 660, dropsId: 'L022', skills: ['petrifyingGaze'] },
        zombie: { id: 'zombie', name: "殭屍", level: 5, stats: { hp: 180, mp: 0, atk: 32, def: 15, spi: 0, hit: 5, eva: 1, speed: 5, critRate: 0, critDamage: 100 }, exp: 85, dropsId: 'L010', skills: [] },
        giantBat: { id: 'giantBat', name: "巨型蝙蝠", level: 6, stats: { hp: 130, mp: 0, atk: 40, def: 15, spi: 5, hit: 15, eva: 20, speed: 28, critRate: 5, critDamage: 120 }, exp: 105, dropsId: 'L005', skills: [] },
        sandworm: { id: 'sandworm', name: "沙蟲", level: 21, stats: { hp: 700, mp: 0, atk: 100, def: 70, spi: 10, hit: 12, eva: 8, speed: 16, critRate: 5, critDamage: 150 }, exp: 820, dropsId: 'L013', skills: [] },
        griffin: { id: 'griffin', name: "獅鷲", level: 23, stats: { hp: 800, mp: 80, atk: 120, def: 60, spi: 40, hit: 20, eva: 25, speed: 40, critRate: 15, critDamage: 150 }, exp: 1000, dropsId: 'L014', skills: ['wingSlash'] },
        cyclops: { id: 'cyclops', name: "獨眼巨人", level: 27, stats: { hp: 1000, mp: 0, atk: 130, def: 75, spi: 10, hit: 13, eva: 10, speed: 19, critRate: 10, critDamage: 170 }, exp: 1400, dropsId: 'L015', skills: ['ogreClub'] },
        kraken: { id: 'kraken', name: "挪威海怪", level: 48, stats: { hp: 3800, mp: 300, atk: 230, def: 120, spi: 90, hit: 20, eva: 15, speed: 30, critRate: 10, critDamage: 180 }, exp: 11000, dropsId: 'L032', skills: ['ogreClub'] },
        deathKnight: { id: 'deathKnight', name: "死亡騎士", level: 46, stats: { hp: 2900, mp: 250, atk: 215, def: 140, spi: 110, hit: 26, eva: 22, speed: 40, critRate: 15, critDamage: 170 }, exp: 9000, dropsId: 'L030', skills: ['charge', 'lifeDrain'] },
        shadowStalker: { id: 'shadowStalker', name: "暗影潛行者", level: 33, stats: { hp: 1100, mp: 150, atk: 155, def: 80, spi: 80, hit: 30, eva: 40, speed: 55, critRate: 25, critDamage: 180 }, exp: 2700, dropsId: 'L024', skills: [] },
        treant: { id: 'treant', name: "樹人", level: 24, stats: { hp: 900, mp: 100, atk: 105, def: 90, spi: 50, hit: 14, eva: 5, speed: 10, critRate: 5, critDamage: 150 }, exp: 1100, dropsId: 'L004', skills: ['trollRegen'] },
        mimic: { id: 'mimic', name: "寶箱怪", level: 10, stats: { hp: 220, mp: 0, atk: 65, def: 30, spi: 20, hit: 20, eva: 10, speed: 15, critRate: 5, critDamage: 150 }, exp: 230, dropsId: 'L002', skills: [] },
        imp: { id: 'imp', name: "小惡魔", level: 7, stats: { hp: 120, mp: 50, atk: 30, def: 15, spi: 40, hit: 16, eva: 18, speed: 24, critRate: 5, critDamage: 120 }, exp: 135, dropsId: 'L009', skills: ['minorHeal'] },
        yeti: { id: 'yeti', name: "雪怪", level: 34, stats: { hp: 1400, mp: 60, atk: 160, def: 95, spi: 30, hit: 14, eva: 12, speed: 22, critRate: 10, critDamage: 170 }, exp: 3000, dropsId: 'L025', skills: ['ogreClub'] },
    },
    items: {
        healingEgg: { id: 'healingEgg', name: '補血蛋', type: 'consumable', effect: { type: 'heal_hp', value: 50 }, description: '恢復50點生命值。', value: 10, sellValue: 5, stock: 10 },
        manaTea: { id: 'manaTea', name: '魔力奶茶', type: 'consumable', effect: { type: 'heal_mp', value: 30 }, description: '恢復30點法力值。', value: 15, sellValue: 7, stock: 5 },
        stoneSkinPotion: { id: 'stoneSkinPotion', name: '石膚藥水', type: 'consumable', effect: { id: 'stoneSkin', name: '石膚', type: 'buff', stat: 'def', value: 10, turns: 3}, description: '3回合內提升防禦力(Def+10)。', value: 30, sellValue: 15, stock: 3, combatOnly: true},
        swiftnessPotion: { id: 'swiftnessPotion', name: '疾風藥劑', type: 'consumable', effect: { id: 'swiftness', name: '疾風', type: 'buff', stat: 'eva', value: 10, turns: 3}, description: '3回合內提升閃避(Eva+10)。', value: 30, sellValue: 15, stock: 3, combatOnly: true},
        giantsElixir: { id: 'giantsElixir', name: '巨力藥劑', type: 'consumable', effect: { id: 'giantsStrength', name: '巨力', type: 'buff', stat: 'atk', value: 10, turns: 3}, description: '3回合內提升攻擊力(Atk+10)。', value: 50, sellValue: 25, stock: 2, combatOnly: true},
        antidote: { id: 'antidote', name: '解毒劑', type: 'consumable', effect: { type: 'cure', ailment: 'poison'}, description: '解除中毒狀態。', value: 25, sellValue: 12, stock: 5},
        smokeBomb: { id: 'smokeBomb', name: '煙霧彈', type: 'consumable', effect: { type: 'escape'}, description: '保證從非頭目戰中逃脫。', value: 40, sellValue: 20, stock: 1, combatOnly: true},
        
        // --- 武器 (39) ---
        // 劍客
        smallSword: { id: 'smallSword', name: '小劍', type: 'weapon', slot: 'weapon', class: ['swordsman'], stats: { atk: 3, hit: 2 }, description: '一把普通的單手劍。', value: 20 },
        fineLongsword: { id: 'fineLongsword', name: '精良的長劍', type: 'weapon', slot: 'weapon', class: ['swordsman'], stats: { atk: 8, hit: 4 }, description: '由軍團工匠打造的長劍。', value: 80 },
        legionCommanderSword: { id: 'legionCommanderSword', name: '帝國軍團長劍', type: 'weapon', slot: 'weapon', class: ['swordsman'], stats: { atk: 15, def: 5, hit: 6 }, description: '隊長的佩劍，象徵著榮耀。', value: 200, rarity: 'epic'},
        gladius: { id: 'gladius', name: '羅馬短劍', type: 'weapon', slot: 'weapon', class: ['swordsman'], stats: { atk: 12, speed: 2 }, description: '輕巧而致命的短劍。', value: 150 },
        zweihander: { id: 'zweihander', name: '雙手巨劍', type: 'weapon', slot: 'weapon', class: ['swordsman'], stats: { atk: 25, speed: -5, critDamage: 10 }, description: '需要雙手才能揮舞的巨大劍刃。', value: 350 },
        runicBlade: { id: 'runicBlade', name: '符文之刃', type: 'weapon', slot: 'weapon', class: ['swordsman'], stats: { atk: 18, spi: 5, mp: 20 }, description: '刻有魔法符文的劍。', value: 500, rarity: 'epic' },
        flamberge: { id: 'flamberge', name: '焰形劍', type: 'weapon', slot: 'weapon', class: ['swordsman'], stats: { atk: 22, critRate: 5 }, description: '波浪形的劍刃能造成可怕的傷口。', value: 650 },
        katana: { id: 'katana', name: '武士刀', type: 'weapon', slot: 'weapon', class: ['swordsman'], stats: { atk: 20, speed: 5, critRate: 3 }, description: '東方國度的神秘兵器。', value: 700 },
        // 修士
        monksGloves: { id: 'monksGloves', name: '修行者拳套', type: 'weapon', slot: 'weapon', class: ['monk'], stats: { atk: 2, spi: 4, hit: 3 }, description: '纏繞著信念的布手套。', value: 25 },
        acolyteBeads: { id: 'acolyteBeads', name: '見習修士的念珠', type: 'weapon', slot: 'weapon', class: ['monk'], stats: { spi: 8, mp: 15, hit: 5 }, description: '注入了禱文的木製念珠。', value: 90 },
        ironFist: { id: 'ironFist', name: '鐵拳套', type: 'weapon', slot: 'weapon', class: ['monk'], stats: { atk: 10, def: 5 }, description: '能輕易擊碎骨頭的鐵製拳套。', value: 180 },
        spiritChakram: { id: 'spiritChakram', name: '靈環', type: 'weapon', slot: 'weapon', class: ['monk'], stats: { spi: 15, speed: 5 }, description: '灌注了靈魂能量的環刃。', value: 400 },
        dragonClaws: { id: 'dragonClaws', name: '龍爪', type: 'weapon', slot: 'weapon', class: ['monk'], stats: { atk: 15, spi: 10, critRate: 5 }, description: '模仿龍爪製成的拳套。', value: 750, rarity: 'epic' },
        staffOfWisdom: { id: 'staffOfWisdom', name: '智慧之杖', type: 'weapon', slot: 'weapon', class: ['monk'], stats: { spi: 20, mp: 50 }, description: '據說能增強持有者的智慧。', value: 800 },
        // 獸人
        orcishAxe: { id: 'orcishAxe', name: '獸人手斧', type: 'weapon', slot: 'weapon', class: ['orc'], stats: { atk: 5, hit: 1 }, description: '粗製但致命的武器。', value: 30 },
        boneCrusher: { id: 'boneCrusher', name: '獸人碎骨棒', type: 'weapon', slot: 'weapon', class: ['orc'], stats: { atk: 12, hp: 20 }, description: '沾滿不知名生物體液的巨大棍棒。', value: 150 },
        greatAxe: { id: 'greatAxe', name: '巨斧', type: 'weapon', slot: 'weapon', class: ['orc'], stats: { atk: 28, def: -5 }, description: '犧牲防禦換取極致破壞力。', value: 450 },
        skullMasher: { id: 'skullMasher', name: '碎顱者', type: 'weapon', slot: 'weapon', class: ['orc'], stats: { atk: 20, critDamage: 20 }, description: '頂部鑲嵌著一顆巨大頭骨的釘頭錘。', value: 600 },
        berserkerClaws: { id: 'berserkerClaws', name: '狂戰士之爪', type: 'weapon', slot: 'weapon', class: ['orc'], stats: { atk: 18, speed: 8, eva: -5 }, description: '讓使用者陷入瘋狂的利爪。', value: 720, rarity: 'epic' },
        // 死靈
        boneWand: { id: 'boneWand', name: '骸骨魔棒', type: 'weapon', slot: 'weapon', class: ['necromancer'], stats: { spi: 6, hit: 4 }, description: '散發著微弱的靈魂能量。', value: 40 },
        specterWand: { id: 'specterWand', name: '怨靈法杖', type: 'weapon', slot: 'weapon', class: ['necromancer'], stats: { spi: 10, mp: 20, hit: 7 }, description: '頂端的水晶封印著一個不安的靈魂。', value: 120 },
        ritualDagger: { id: 'ritualDagger', name: '儀式匕首', type: 'weapon', slot: 'weapon', class: ['necromancer'], stats: { spi: 12, critRate: 3 }, description: '用於黑暗儀式的匕首。', value: 250 },
        lichStaff: { id: 'lichStaff', name: '巫妖之杖', type: 'weapon', slot: 'weapon', class: ['necromancer'], stats: { spi: 25, mp: 40 }, description: '蘊含著巫妖強大魔力的法杖。', value: 850, rarity: 'epic' },
        soulScythe: { id: 'soulScythe', name: '噬魂之鐮', type: 'weapon', slot: 'weapon', class: ['necromancer'], stats: { spi: 22, hp: -30 }, description: '能收割靈魂，但也會反噬持有者。', value: 900 },
        // 通用
        dagger: { id: 'dagger', name: '匕首', type: 'weapon', slot: 'weapon', stats: { atk: 8, speed: 5 }, description: '適合快速攻擊的武器。', value: 90 },
        shortBow: { id: 'shortBow', name: '短弓', type: 'weapon', slot: 'weapon', stats: { atk: 10, hit: 5 }, description: '遠程攻擊的入門武器。', value: 120 },
        ironSpear: { id: 'ironSpear', name: '鐵矛', type: 'weapon', slot: 'weapon', stats: { atk: 14, def: 3 }, description: '攻守兼備的長柄武器。', value: 220 },
        magicTome: { id: 'magicTome', name: '魔法書', type: 'weapon', slot: 'weapon', stats: { spi: 10, mp: 10 }, description: '記載著基礎魔法的書籍。', value: 200 },
        crystalBall: { id: 'crystalBall', name: '水晶球', type: 'weapon', slot: 'weapon', stats: { spi: 18, eva: 5 }, description: '能預見敵人動向的水晶球。', value: 550 },
        holyMace: { id: 'holyMace', name: '聖鎚', type: 'weapon', slot: 'weapon', stats: { atk: 15, spi: 10 }, description: '灌注了神聖力量的鎚子，對不死生物特效。', value: 680 },
        
        // --- 護甲 (36) ---
        // 護甲
        leatherArmor: { id: 'leatherArmor', name: '皮甲', type: 'armor', slot: 'armor', stats: { def: 5, eva: 2 }, description: '基本的皮革護甲。', value: 25 },
        chainmail: { id: 'chainmail', name: '鎖子甲', type: 'armor', slot: 'armor', stats: { def: 12 }, description: '能有效抵禦劈砍的金屬甲。', value: 100 },
        mageRobe: { id: 'mageRobe', name: '法師長袍', type: 'armor', slot: 'armor', stats: { def: 3, spi: 8 }, description: '繡有符文的布袍。', value: 70 },
        plateArmor: { id: 'plateArmor', name: '板甲', type: 'armor', slot: 'armor', stats: { def: 20, speed: -5 }, description: '提供絕佳防護的重型盔甲。', value: 300 },
        shadowCloak: { id: 'shadowCloak', name: '暗影斗篷', type: 'armor', slot: 'armor', stats: { def: 8, eva: 10 }, description: '能融入陰影的魔法斗篷。', value: 450, rarity: 'epic'},
        holyRobe: { id: 'holyRobe', name: '神聖長袍', type: 'armor', slot: 'armor', stats: { def: 7, spi: 15 }, description: '受到神明祝福的長袍。', value: 520 },
        barbarianFur: { id: 'barbarianFur', name: '野蠻人毛皮', type: 'armor', slot: 'armor', stats: { def: 10, hp: 30 }, description: '由巨獸毛皮製成的護甲。', value: 380 },
        assassinGarb: { id: 'assassinGarb', name: '刺客信條', type: 'armor', slot: 'armor', stats: { def: 10, speed: 5, critRate: 3 }, description: '適合潛行與突襲的輕甲。', value: 600 },
        // 配件
        courageBadge: { id: 'courageBadge', name: '勇氣徽章', type: 'accessory', slot: 'accessory', stats: { atk: 3 }, description: '一枚小小的徽章，能激發潛力。', value: 50 },
        guardianRing: { id: 'guardianRing', name: '守護者之戒', type: 'accessory', slot: 'accessory', stats: { def: 3 }, description: '鑲嵌著守護石的戒指。', value: 50 },
        eagleEyeRing: { id: 'eagleEyeRing', name: '鷹眼指環', type: 'accessory', slot: 'accessory', stats: { hit: 5 }, description: '能讓你看得更清楚。', value: 50 },
        swiftBoots: { id: 'swiftBoots', name: '疾行之靴', type: 'accessory', slot: 'accessory', stats: { speed: 8 }, description: '穿上後能健步如飛。', value: 120 },
        amuletOfPower: { id: 'amuletOfPower', name: '力量護符', type: 'accessory', slot: 'accessory', stats: { atk: 5, spi: 5 }, description: '同時增強物理與魔法力量。', value: 200 },
        ringOfVitality: { id: 'ringOfVitality', name: '活力戒指', type: 'accessory', slot: 'accessory', stats: { hp: 50 }, description: '能增強佩戴者的生命力。', value: 180 },
        criticalLens: { id: 'criticalLens', name: '暴擊透鏡', type: 'accessory', slot: 'accessory', stats: { critRate: 7 }, description: '能幫助你看穿敵人的弱點。', value: 300, rarity: 'epic' },
        amuletOfResistance: { id: 'amuletOfResistance', name: '抗性護符', type: 'accessory', slot: 'accessory', stats: { def: 4, spi: 4 }, description: '提升對物理與魔法的抗性。', value: 250 },
        
        // --- 技能書 (10) ---
        skillBookWhirlwind: { id: 'skillBookWhirlwind', name: '技能書:旋風斬', type: 'skillbook', skillId: 'whirlwind', class: ['swordsman'], description: '記載著旋風斬的卷軸。', value: 1000 },
        skillBookLifeBalance: { id: 'skillBookLifeBalance', name: '技能書:生死平衡', type: 'skillbook', skillId: 'lifeBalance', class: ['monk'], description: '闡述生死平衡之道的經文。', value: 1200 },
        skillBookFrenzy: { id: 'skillBookFrenzy', name: '技能書:狂暴', type: 'skillbook', skillId: 'frenzy', class: ['orc'], description: '能激發內心狂怒的圖騰。', value: 1100 },
        skillBookLifeDrain: { id: 'skillBookLifeDrain', name: '技能書:生命汲取', type: 'skillbook', skillId: 'lifeDrain', class: ['necromancer'], description: '記載著禁忌吸血魔法的書頁。', value: 1500 },
        skillBookBladeStorm: { id: 'skillBookBladeStorm', name: '秘傳書:劍刃風暴', type: 'skillbook', skillId: 'bladeStorm', class: ['swordsman'], levelReq: 20, description: '劍聖的終極奧義。', value: 5000, rarity: 'epic' },
        skillBookEnlightenment: { id: 'skillBookEnlightenment', name: '佛經:頓悟', type: 'skillbook', skillId: 'enlightenment', class: ['monk'], levelReq: 25, description: '蘊含著天地至理的古老經文。', value: 8000, rarity: 'epic' },
        skillBookRampage: { id: 'skillBookRampage', name: '圖騰:暴走', type: 'skillbook', skillId: 'rampage', class: ['orc'], levelReq: 22, description: '繪有遠古巨獸的狂暴圖騰。', value: 6500, rarity: 'epic' },
        skillBookDeathPact: { id: 'skillBookDeathPact', name: '魔典:死亡契約', type: 'skillbook', skillId: 'deathPact', class: ['necromancer'], levelReq: 24, description: '與死亡簽訂契約的禁忌之書。', value: 7500, rarity: 'epic' },
        skillBookTaunt: { id: 'skillBookTaunt', name: '戰吼之書:嘲諷', type: 'skillbook', skillId: 'taunt', class: ['orc'], description: '教你如何用言語激怒敵人。', value: 800 },
        skillBookCurse: { id: 'skillBookCurse', name: '詛咒之書', type: 'skillbook', skillId: 'curse', class: ['necromancer'], description: '一本充滿惡毒詛咒的書。', value: 1300 },
        
        // --- 材料 ---
        brokenFabric: { id: 'brokenFabric', name: '破損的布料', type: 'material', description: '從敵人身上剝下的破布。', value: 2 },
        legionBadge: { id: 'legionBadge', name: '軍團徽章', type: 'material', description: '第五軍團的徽章。', value: 5 },
    },
    dropTables: {
        L001: [ { itemId: 'brokenFabric', chance: 0.5, quantity: [1, 2] }, { itemId: 'healingEgg', chance: 0.3, quantity: [1, 1] }, { itemId: 'gold', chance: 1, quantity: [5, 10], isMoney: true }],
        L002: [ { itemId: 'brokenFabric', chance: 0.6, quantity: [1, 3] }, { itemId: 'smallSword', chance: 0.1, quantity: [1, 1], class: ['swordsman'] }, { itemId: 'monksGloves', chance: 0.1, quantity: [1, 1], class: ['monk']}, { itemId: 'gold', chance: 1, quantity: [12, 22], isMoney: true }],
        L003: [ { itemId: 'brokenFabric', chance: 0.7, quantity: [1, 2] }, { itemId: 'healingEgg', chance: 0.3, quantity: [1, 1] }, { itemId: 'swiftnessPotion', chance: 0.1, quantity: [1, 1]}, { itemId: 'gold', chance: 1, quantity: [10, 18], isMoney: true }],
        L004: [ { itemId: 'orcishAxe', chance: 0.1, quantity: [1,1], class: ['orc'] }, { itemId: 'leatherArmor', chance: 0.05, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [15, 25], isMoney: true }],
        L005: [ { itemId: 'healingEgg', chance: 0.4, quantity: [1,2]}, { itemId: 'courageBadge', chance: 0.05, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [18, 30], isMoney: true }],
        L006: [ { itemId: 'fineLongsword', chance: 0.1, quantity: [1, 1], class: ['swordsman']}, { itemId: 'orcishAxe', chance: 0.1, quantity: [1, 1], class: ['orc']}, { itemId: 'leatherArmor', chance: 0.15, quantity: [1, 1]}, { itemId: 'gold', chance: 1, quantity: [20, 35], isMoney: true }],
        L007: [ { itemId: 'fineLongsword', chance: 0.2, quantity: [1, 1], class: ['swordsman']}, { itemId: 'orcishAxe', chance: 0.2, quantity: [1, 1], class: ['orc']}, { itemId: 'chainmail', chance: 0.1, quantity: [1, 1]}, { itemId: 'giantsElixir', chance: 0.05, quantity: [1, 1]}, { itemId: 'gold', chance: 1, quantity: [25, 40], isMoney: true }],
        L008: [ { itemId: 'legionBadge', chance: 0.5, quantity: [1,1]}, { itemId: 'fineLongsword', chance: 0.15, quantity: [1, 1], class: ['swordsman']}, { itemId: 'acolyteBeads', chance: 0.1, quantity: [1, 1], class: ['monk']}, { itemId: 'gold', chance: 1, quantity: [30, 50], isMoney: true }],
        L009: [ { itemId: 'mageRobe', chance: 0.15, quantity: [1, 1]}, { itemId: 'acolyteBeads', chance: 0.1, quantity: [1, 1], class: ['monk']}, { itemId: 'boneWand', chance: 0.1, quantity: [1, 1], class: ['necromancer']}, { itemId: 'manaTea', chance: 0.3, quantity: [1, 2]}, { itemId: 'gold', chance: 1, quantity: [35, 60], isMoney: true}],
        L010: [ { itemId: 'brokenFabric', chance: 0.5, quantity: [1, 3] }, { itemId: 'boneWand', chance: 0.1, quantity: [1, 1], class: ['necromancer']}, { itemId: 'chainmail', chance: 0.1, quantity: [1, 1]}, { itemId: 'gold', chance: 1, quantity: [40, 70], isMoney: true}],
        L011: [ { itemId: 'manaTea', chance: 0.5, quantity: [1, 2] }, { itemId: 'specterWand', chance: 0.1, quantity: [1, 1], class: ['necromancer']}, { itemId: 'mageRobe', chance: 0.1, quantity: [1, 1]}, { itemId: 'gold', chance: 1, quantity: [50, 80], isMoney: true}],
        L012: [ { itemId: 'orcishAxe', chance: 0.2, quantity: [1, 1], class: ['orc']}, { itemId: 'fineLongsword', chance: 0.2, quantity: [1, 1], class: ['swordsman']}, { itemId: 'courageBadge', chance: 0.1, quantity: [1, 1]}, { itemId: 'gold', chance: 1, quantity: [60, 100], isMoney: true}],
        L013: [{ itemId: 'guardianRing', chance: 0.1, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [100, 150], isMoney: true}],
        L014: [{ itemId: 'swiftBoots', chance: 0.1, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [120, 180], isMoney: true}],
        L015: [{ itemId: 'giantsElixir', chance: 0.2, quantity: [1,1]}, { itemId: 'plateArmor', chance: 0.05, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [150, 220], isMoney: true}],
        L016: [{ itemId: 'amuletOfResistance', chance: 0.1, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [180, 250], isMoney: true}],
        L017: [{ itemId: 'ritualDagger', chance: 0.08, quantity: [1,1], class: ['necromancer']}, { itemId: 'assassinGarb', chance: 0.05, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [220, 300], isMoney: true}],
        L018: [{ itemId: 'ringOfVitality', chance: 0.15, quantity: [1,1]}, { itemId: 'skillBookTaunt', chance: 0.02, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [280, 400], isMoney: true}],
        L019: [{ itemId: 'greatAxe', chance: 0.1, quantity: [1,1], class: ['orc']}, { itemId: 'plateArmor', chance: 0.1, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [350, 500], isMoney: true}],
        L020: [{ itemId: 'flamberge', chance: 0.07, quantity: [1,1], class: ['swordsman']}, { itemId: 'holyRobe', chance: 0.07, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [450, 600], isMoney: true}],
        L021: [{ itemId: 'magicTome', chance: 0.1, quantity: [1,1]}, { itemId: 'amuletOfPower', chance: 0.1, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [500, 700], isMoney: true}],
        L022: [{ itemId: 'stoneSkinPotion', chance: 0.3, quantity: [1,2]}, { itemId: 'guardianRing', chance: 0.1, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [550, 750], isMoney: true}],
        L023: [{ itemId: 'criticalLens', chance: 0.05, quantity: [1,1]}, { itemId: 'skillBookCurse', chance: 0.03, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [650, 900], isMoney: true}],
        L024: [{ itemId: 'katana', chance: 0.08, quantity: [1,1], class: ['swordsman']}, { itemId: 'shadowCloak', chance: 0.08, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [800, 1100], isMoney: true}],
        L025: [{ itemId: 'berserkerClaws', chance: 0.07, quantity: [1,1], class: ['orc']}, { itemId: 'skillBookRampage', chance: 0.02, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [1000, 1500], isMoney: true}],
        L026: [{ itemId: 'spiritChakram', chance: 0.08, quantity: [1,1], class: ['monk']}, { itemId: 'swiftBoots', chance: 0.15, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [1200, 1800], isMoney: true}],
        L027: [{ itemId: 'dragonClaws', chance: 0.06, quantity: [1,1], class: ['monk']}, { itemId: 'ringOfVitality', chance: 0.2, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [1500, 2200], isMoney: true}],
        L028: [{ itemId: 'lichStaff', chance: 0.05, quantity: [1,1], class: ['necromancer']}, { itemId: 'skillBookDeathPact', chance: 0.01, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [1800, 2800], isMoney: true}],
        L029: [{ itemId: 'zweihander', chance: 0.07, quantity: [1,1], class: ['swordsman']}, { itemId: 'plateArmor', chance: 0.15, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [2200, 3200], isMoney: true}],
        L030: [{ itemId: 'runicBlade', chance: 0.06, quantity: [1,1], class: ['swordsman']}, { itemId: 'skillBookBladeStorm', chance: 0.01, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [2800, 4000], isMoney: true}],
        L031: [{ itemId: 'soulScythe', chance: 0.05, quantity: [1,1], class: ['necromancer']}, { itemId: 'holyMace', chance: 0.08, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [3500, 5000], isMoney: true}],
        L032: [{ itemId: 'staffOfWisdom', chance: 0.05, quantity: [1,1], class: ['monk']}, { itemId: 'skillBookEnlightenment', chance: 0.01, quantity: [1,1]}, { itemId: 'gold', chance: 1, quantity: [10000, 20000], isMoney: true}],
    },
    skills: {
        // [修正] 為所有傷害技能補充 damageMultiplier (Sec 1.3)
        // --- 劍客 (10) ---
        slash: { name: '斬擊', class:'swordsman', type: 'physical', targetType: 'single', maxLevel: 5, levelReq: 1, levels: [
            { mpCost: 5, damageMultiplier: 1.5, description: '對單一敵人造成<span class="text-yellow-400">150%</span>攻擊力的物理傷害。' },
            { mpCost: 6, damageMultiplier: 1.7, description: '對單一敵人造成<span class="text-yellow-400">170%</span>攻擊力的物理傷害。' },
            { mpCost: 7, damageMultiplier: 1.9, description: '對單一敵人造成<span class="text-yellow-400">190%</span>攻擊力的物理傷害。' },
            { mpCost: 8, damageMultiplier: 2.1, description: '對單一敵人造成<span class="text-yellow-400">210%</span>攻擊力的物理傷害。' },
            { mpCost: 9, damageMultiplier: 2.3, description: '對單一敵人造成<span class="text-yellow-400">230%</span>攻擊力的物理傷害。' },
        ]},
        whirlwind: { name: '旋風斬', class:'swordsman', type: 'physical', targetType: 'all', maxLevel: 3, levelReq: 3, prerequisite: { skillId: 'slash', level: 2 }, levels: [
            { mpCost: 15, damageMultiplier: 1.1, description: '揮舞武器，對所有敵人造成<span class="text-yellow-400">110%</span>攻擊力的物理傷害。' },
            { mpCost: 17, damageMultiplier: 1.2, description: '更強力的旋風斬，對所有敵人造成<span class="text-yellow-400">120%</span>攻擊力的物理傷害。' },
            { mpCost: 19, damageMultiplier: 1.3, description: '毀滅性的旋風斬，對所有敵人造成<span class="text-yellow-400">130%</span>攻擊力的物理傷害。' },
        ]},
        powerStrike: { name: '強力打擊', class:'swordsman', type: 'physical', targetType: 'single', maxLevel: 2, levelReq: 5, prerequisite: { skillId: 'slash', level: 3 }, levels: [
            { mpCost: 10, damageMultiplier: 2.2, description: '蓄力一擊，造成<span class="text-yellow-400">220%</span>攻擊力的巨大傷害。' },
            { mpCost: 12, damageMultiplier: 2.5, description: '全力蓄力，造成<span class="text-yellow-400">250%</span>攻擊力的毀滅性傷害。' },
        ]},
        shieldBash: { name: '盾牌猛擊', class:'swordsman', type: 'physical', targetType: 'single', maxLevel: 1, levelReq: 8, prerequisite: { skillId: 'whirlwind', level: 2 }, levels: [
            { mpCost: 12, damageMultiplier: 1.2, description: '用盾牌猛擊敵人，造成<span class="text-yellow-400">120%</span>攻擊力的物理傷害，並有機率使其<span class="text-orange-400">昏迷</span>。' },
        ]},
        charge: { name: '衝鋒', class:'swordsman', type: 'physical', targetType: 'single', maxLevel: 1, levelReq: 12, prerequisite: { skillId: 'powerStrike', level: 2 }, levels: [
            { mpCost: 15, damageMultiplier: 1.8, description: '向目標衝鋒，造成<span class="text-yellow-400">180%</span>攻擊力的物理傷害，並<span class="text-orange-400">延後其行動</span>。' },
        ]},
        defensiveStance: { name: '防禦姿態', class:'swordsman', type: 'buff', targetType: 'self', maxLevel: 1, levelReq: 6, levels: [{ mpCost: 10, effect: { id: 'defensiveStance', name: '防禦姿態', stat: 'def', value: 20, turns: 3}, description: '進入防禦姿態，提升<span class="text-green-400">20</span>點防禦力，持續3回合。'}] },
        battleCry: { name: '戰吼', class:'swordsman', type: 'buff', targetType: 'self', maxLevel: 1, levelReq: 10, levels: [{ mpCost: 18, effect: { id: 'battleCry', name: '戰吼', stat: 'atk', value: 15, turns: 3}, description: '發出怒吼，提升<span class="text-green-400">15</span>點攻擊力，持續3回合。'}] },
        ironWill: { name: '鋼鐵意志', class:'swordsman', type: 'passive', levelReq: 15, levels: [{ description: '被動：生命值低於<span class="text-red-400">30%</span>時，防禦力大幅提升。'}] },
        lastStand: { name: '背水一戰', class:'swordsman', type: 'utility', targetType: 'self', maxLevel: 1, levelReq: 20, prerequisite: { skillId: 'ironWill', level: 1 }, levels: [{ mpCost: 30, description: '消耗大量法力，下一次攻擊必定<span class="text-red-500">暴擊</span>。'}] },
        bladeStorm: { name: '劍刃風暴', class:'swordsman', type: 'physical', targetType: 'all', maxLevel: 1, levelReq: 25, prerequisite: { skillId: 'whirlwind', level: 3 }, levels: [{ mpCost: 50, damageMultiplier: 2.0, description: '化身為劍刃的風暴，對所有敵人造成毀滅性的<span class="text-yellow-400">200%</span>物理傷害。'}] },
        
        // --- 修士 ---
        spiritualPalm: { name: '靈氣掌', class:'monk', type: 'magical', targetType: 'single', maxLevel: 1, levelReq: 1, levels: [
            { mpCost: 8, damageMultiplier: 1.8, description: '匯聚靈力於掌心，對敵人造成<span class="text-purple-400">180%</span>靈力的靈力傷害。' },
        ]},
        chiWave: { name: '真氣波', class:'monk', type: 'magical', targetType: 'all', maxLevel: 3, levelReq: 3, prerequisite: { skillId: 'spiritualPalm', level: 1 }, levels: [
            { mpCost: 20, damageMultiplier: 0.9, description: '釋放真氣衝擊波，對所有敵人造成<span class="text-purple-400">90%</span>靈力的靈力傷害。' },
            { mpCost: 22, damageMultiplier: 1.0, description: '更強的真氣波，造成<span class="text-purple-400">100%</span>靈力的靈力傷害。' },
            { mpCost: 24, damageMultiplier: 1.1, description: '極致的真氣波，造成<span class="text-purple-400">110%</span>靈力的靈力傷害。' },
        ]},
        lifeBalance: { name: '生死平衡', class:'monk', type: 'heal_attack', targetType: 'self', maxLevel: 2, levelReq: 5, prerequisite: { skillId: 'chiWave', level: 2 }, levels: [
            { mpCost: 18, healRatio: 0.5, attackRatio: 0.7, description: '治療自身<span class="text-green-400">50%靈力</span>的生命，並對所有敵人造成<span class="text-purple-400">70%治療量</span>的靈力傷害。' },
            { mpCost: 20, healRatio: 0.6, attackRatio: 0.8, description: '治療自身<span class="text-green-400">60%靈力</span>的生命，並對所有敵人造成<span class="text-purple-400">80%治療量</span>的靈力傷害。' },
        ]},
        serenity: { name: '心如止水', class:'monk', type: 'buff', targetType: 'self', maxLevel: 1, levelReq: 8, levels: [{ mpCost: 22, effect: {id: 'serenity', name: '心如止水', stat: 'spi', value: 15, turns: 3}, description: '進入冥想狀態，大幅提升<span class="text-green-400">15</span>點靈力，持續3回合。'}] },
        divineStrike: { name: '神聖打擊', class:'monk', type: 'magical', targetType: 'single', maxLevel: 1, levelReq: 10, prerequisite: { skillId: 'serenity', level: 1 }, levels: [
            { mpCost: 25, damageMultiplier: 2.5, description: '灌注神聖力量的一擊，造成<span class="text-purple-400">250%</span>靈力傷害，對不死生物有奇效。' },
        ]},
        guardianSpirit: { name: '守護靈', class:'monk', type: 'buff', targetType: 'self', maxLevel: 1, levelReq: 7, levels: [{ mpCost: 15, effect: {id: 'guardianSpirit', name: '守護靈', stat: 'def', value: 15, turns: 3}, description: '召喚守護靈，提升<span class="text-green-400">15</span>點防禦，持續3回合。'}]},
        innerPeace: { name: '心靜如水', class:'monk', type: 'heal', targetType: 'self', maxLevel: 1, levelReq: 13, levels: [{ mpCost: 20, description: '平靜心靈，恢復<span class="text-blue-400">30%</span>最大法力值。'}]},
        karmaBlade: { name: '業報之刃', class:'monk', type: 'magical', targetType: 'single', maxLevel: 1, levelReq: 18, levels: [{ mpCost: 28, description: '將<span class="text-red-400">已損失的生命值</span>轉化為力量攻擊敵人。'}]},
        thousandPalms: { name: '千手神通', class:'monk', type: 'magical', targetType: 'random', maxLevel: 1, levelReq: 22, prerequisite: { skillId: 'karmaBlade', level: 1 }, levels: [{ mpCost: 40, hits: 5, description: '以肉眼無法捕捉的速度<span class="text-yellow-400">隨機攻擊5次</span>。'}]},
        enlightenment: { name: '頓悟', class:'monk', type: 'passive', levelReq: 28, levels: [{ description: '被動：戰鬥中，有機率恢復消耗的法力。'}]},

        // --- 獸人 ---
        savageCleave: { name: '野蠻劈砍', class:'orc', type: 'physical', targetType: 'single', maxLevel: 2, levelReq: 1, levels: [
            { mpCost: 6, damageMultiplier: 1.6, description: '充滿原始怒意的劈砍，造成<span class="text-yellow-400">160%</span>攻擊力的傷害。' },
            { mpCost: 8, damageMultiplier: 2.0, description: '更為狂暴的劈砍，造成<span class="text-yellow-400">200%</span>攻擊力的傷害。' },
        ]},
        earthStomp: { name: '大地踐踏', class:'orc', type: 'physical', targetType: 'all', maxLevel: 2, levelReq: 3, prerequisite: { skillId: 'savageCleave', level: 2 }, levels: [
            { mpCost: 18, damageMultiplier: 1.0, description: '猛擊地面，對所有敵人造成<span class="text-yellow-400">100%</span>攻擊力的傷害。' },
            { mpCost: 22, damageMultiplier: 1.2, description: '足以震裂大地的猛擊，造成<span class="text-yellow-400">120%</span>攻擊力的傷害。' },
        ]},
        frenzy: { name: '狂暴', class:'orc', type: 'buff', targetType: 'self', maxLevel: 1, levelReq: 5, prerequisite: { skillId: 'savageCleave', level: 1 }, levels: [
            { hpCost: 0.1, effect: {id: 'frenzy', name: '狂暴', stat: 'atk', value: 20, turns: 3}, description: '犧牲<span class="text-red-400">10%</span>生命，換取<span class="text-green-400">20</span>點攻擊力，持續3回合。' },
        ]},
        brutalCharge: { name: '殘暴衝鋒', class:'orc', type: 'physical', targetType: 'single', maxLevel: 1, levelReq: 8, prerequisite: { skillId: 'frenzy', level: 1 }, levels: [{ mpCost: 20, damageMultiplier: 1.8, description: '勢不可擋的衝鋒，造成<span class="text-yellow-400">180%</span>攻擊力的傷害並有機率<span class="text-orange-400">擊暈</span>敵人。'}] },
        bloodlust: { name: '嗜血渴望', class:'orc', type: 'passive', levelReq: 10, levels: [{ description: '被動：攻擊時，有機會<span class="text-green-400">吸取生命</span>。'}]},
        taunt: { name: '嘲諷', class:'orc', type: 'debuff', targetType: 'single', maxLevel: 1, levelReq: 4, levels: [{ mpCost: 10, description: '<span class="text-orange-400">激怒</span>一個敵人，使其強制攻擊你。'}] },
        stoneSkin: { name: '石膚', class:'orc', type: 'buff', targetType: 'self', maxLevel: 1, levelReq: 7, levels: [{ mpCost: 12, effect: {id: 'stoneSkinOrc', name: '石膚', stat: 'def', value: 25, turns: 3}, description: '讓皮膚像石頭一樣堅硬，提升<span class="text-green-400">25</span>點防禦，持續3回合。'}]},
        overwhelm: { name: '壓制', class:'orc', type: 'physical', targetType: 'single', maxLevel: 1, levelReq: 14, prerequisite: { skillId: 'bloodlust', level: 1 }, levels: [{ mpCost: 25, damageMultiplier: 2.5, description: '對生命值低於<span class="text-red-400">50%</span>的敵人造成<span class="text-yellow-400">250%</span>的巨大傷害。'}]},
        unbreakable: { name: '不倒', class:'orc', type: 'utility', targetType: 'self', maxLevel: 1, levelReq: 19, levels: [{ mpCost: 40, description: '短時間內，無論如何都<span class="text-green-400">不會倒下</span>。'}]},
        rampage: { name: '暴走', class:'orc', type: 'passive', levelReq: 26, levels: [{ description: '被動：擊敗敵人時會進入<span class="text-red-500">暴走</span>狀態，攻擊力提升。'}]},
        
        // --- 死靈 ---
        boneSpear: { name: '骸骨之矛', class:'necromancer', type: 'magical', targetType: 'single', maxLevel: 2, levelReq: 1, levels: [
            { mpCost: 10, damageMultiplier: 1.8, description: '用死者骨骼化成的長矛穿刺敵人，造成<span class="text-purple-400">180%</span>靈力的傷害。' },
            { mpCost: 12, damageMultiplier: 2.2, description: '更鋒利，更致命的骸骨之矛，造成<span class="text-purple-400">220%</span>靈力的傷害。' },
        ]},
        boneNova: { name: '骸骨新星', class:'necromancer', type: 'magical', targetType: 'all', maxLevel: 2, levelReq: 3, prerequisite: { skillId: 'boneSpear', level: 2 }, levels: [
            { mpCost: 25, damageMultiplier: 1.3, description: '引爆骸骨碎片，對所有敵人造成<span class="text-purple-400">130%</span>靈力的傷害。' },
            { mpCost: 30, damageMultiplier: 1.5, description: '更大範圍的骸骨爆炸，造成<span class="text-purple-400">150%</span>靈力的傷害。' },
        ]},
        lifeDrain: { name: '生命汲取', class:'necromancer', type: 'magical_drain', targetType: 'single', maxLevel: 1, levelReq: 5, prerequisite: { skillId: 'boneSpear', level: 1 }, levels: [
            { mpCost: 18, damageMultiplier: 1.5, drainRatio: 0.5, description: '吸取敵人的生命力來治療自己，造成<span class="text-purple-400">150%</span>靈力傷害並恢復<span class="text-green-400">一半</span>傷害的生命。' },
        ]},
        curse: { name: '詛咒', class:'necromancer', type: 'debuff', targetType: 'single', maxLevel: 1, levelReq: 8, levels: [{ mpCost: 15, effect: {id: 'curse', name: '詛咒', stat: 'def', value: -15, turns: 3}, description: '<span class="text-orange-400">削弱</span>敵人的防禦，持續3回合。'}] },
        shadowStep: { name: '暗影步伐', class:'necromancer', type: 'utility', levelReq: 10, prerequisite: { skillId: 'curse', level: 1 }, levels: [{ mpCost: 12, description: '融入陰影，提升下一次攻擊的<span class="text-red-500">暴擊</span>機會。'}]},
        summonSkeleton: { name: '召喚骷髏', class:'necromancer', type: 'summon', targetType: 'self', maxLevel: 1, levelReq: 4, levels: [{ mpCost: 20, description: '從地下召喚骷髏為你作戰。(暫未實現)'}]},
        corpseExplosion: { name: '屍爆', class:'necromancer', type: 'magical', targetType: 'all', maxLevel: 1, levelReq: 11, prerequisite: { skillId: 'boneNova', level: 2 }, levels: [{ mpCost: 22, description: '引爆屍體，對敵人造成範圍傷害。(暫未實現)'}]},
        soulSiphon: { name: '靈魂虹吸', class:'necromancer', type: 'magical_drain', targetType: 'single', maxLevel: 1, levelReq: 16, levels: [{ mpCost: 25, description: '<span class="text-blue-400">吸取</span>敵人的法力。'}]},
        fear: { name: '恐懼', class:'necromancer', type: 'debuff', targetType: 'single', maxLevel: 1, levelReq: 21, levels: [{ mpCost: 30, description: '讓敵人陷入<span class="text-orange-400">恐懼</span>而無法行動。'}]},
        deathPact: { name: '死亡契約', class:'necromancer', type: 'passive', levelReq: 27, levels: [{ description: '被動：死亡時，釋放最後的力量<span class="text-red-500">反噬</span>所有敵人。'}]},

        // --- 怪物技能 ---
        goblinRush: { name: '哥布林猛衝', type: 'physical', targetType: 'single', damageMultiplier: 1.1 },
        poisonBite: { name: '毒咬', type: 'physical', targetType: 'single', damageMultiplier: 1.0, effect: {id: 'poison', name: '中毒', type: 'dot', damageRatio: 0.1, turns: 3} },
        tuskGore: { name: '獠牙穿刺', type: 'physical', targetType: 'single', damageMultiplier: 1.5 },
        furiousBite: { name: '狂怒撕咬', type: 'physical', targetType: 'single', damageMultiplier: 1.2 },
        hobgoblinSmash: { name: '大哥布林重擊', type: 'physical', targetType: 'single', damageMultiplier: 1.6 },
        shamanCurse: { name: '薩滿詛咒', type: 'debuff', targetType: 'single', effect: { id: 'shamanCurse', name: '薩滿詛咒', stat: 'atk', value: -10, turns: 2} },
        minorHeal: { name: '次級治療', type: 'heal', targetType: 'self', healMultiplier: 1.5 },
        shadowBlast: { name: '暗影爆破', type: 'magical', targetType: 'all', damageMultiplier: 1.0 },
        earthSlam: { name: '大地猛擊', type: 'physical', targetType: 'all', damageMultiplier: 1.2 },
        wingSlash: { name: '翼斬', type: 'physical', targetType: 'single', damageMultiplier: 1.4 },
        ogreClub: { name: '食人魔巨棒', type: 'physical', targetType: 'single', damageMultiplier: 1.8 },
        poisonSting: { name: '毒刺', type: 'physical', targetType: 'single', damageMultiplier: 1.3, effect: {id: 'poison', name: '中毒', type: 'dot', damageRatio: 0.15, turns: 3} },
        trollRegen: { name: '巨魔再生', type: 'passive' },
        charge: { name: '衝鋒', type: 'physical', targetType: 'single', damageMultiplier: 1.7 },
        fireBreath: { name: '火焰吐息', type: 'magical', targetType: 'all', damageMultiplier: 1.5 },
        petrifyingGaze: { name: '石化凝視', type: 'debuff', targetType: 'single' },
        multiBite: { name: '多重撕咬', type: 'physical', targetType: 'random', hits: 3, damageMultiplier: 0.8 },
        elementalBlast: { name: '元素爆發', type: 'magical', targetType: 'all', damageMultiplier: 1.3 }
    },
    locations: {
        oakwood: { name: "橡木鎮", description: "一個被森林環繞的寧靜小鎮，但最近似乎不太平靜。" },
        whisperingWoods: { name: "低語森林", monsters: ['slime', 'goblin', 'forestSpider'], levelRange: [1, 3], requiredLevel: 1, storyReq: 'main01' },
        boarPlains: { name: "野豬平原", monsters: ['wildBoar', 'wolf', 'zombie'], levelRange: [3, 5], requiredLevel: 3, storyReq: 'main03' },
        goblinCamp: { name: "哥布林營地", monsters: ['goblin', 'goblinWarrior', 'hobgoblin', 'giantBat'], levelRange: [4, 7], requiredLevel: 5, storyReq: 'main03' },
        orcOutpost: { name: "獸人前哨", monsters: ['orcGrunt', 'orcShaman', 'imp'], levelRange: [7, 10], requiredLevel: 8, storyReq: 'main04' },
        hauntedCemetery: { name: '荒廢墓園', monsters: ['skeleton', 'wraith', 'hauntedArmor', 'mimic'], levelRange: [10, 14], requiredLevel: 11, storyReq: 'main05' },
        dragonPeak: { name: '巨龍之巔', monsters: ['ancientDragon'], levelRange: [50, 50], requiredLevel: 45, storyReq: 'main06' },
    },
    npcs: {
        elder: { name: "村長", type: "quest" },
        blacksmith: { name: "鐵匠", type: "quest" }
    },
    // [修復][問題11, 12] 任務全中文化，並修正NPC對應
    quests: {
        main01: { id: 'main01', title: "森林裡的麻煩", npc: "elder", objective: { type: 'kill', target: 'goblin', current: 0, total: 5 }, reward: { exp: 150, items: [{ itemId: 'healingEgg', quantity: 5 }], gold: 50, skillPoints: 1 }, levelReq: 1, onComplete: (p) => { p.storyProgress = 'main02'; } },
        main02: { id: 'main02', title: "第一次裝備", npc: "blacksmith", objective: { type: 'equip', target: 'any', current: 0, total: 1 }, reward: { exp: 50, items: [{ itemId: 'courageBadge', quantity: 1 }], gold: 20 }, levelReq: 1, onComplete: (p) => { p.storyProgress = 'main03'; } },
        main03: { id: 'main03', title: "等級的考驗", npc: "elder", objective: { type: 'level', target: 'any', current: 0, total: 5 }, reward: { exp: 200, items: [{ itemId: 'giantsElixir', quantity: 3 }], gold: 100 }, levelReq: 3, onComplete: (p) => { p.storyProgress = 'main04'; } },
        main04: { id: 'main04', title: "深入獸人領地", npc: "elder", objective: { type: 'kill', target: 'orcGrunt', current: 0, total: 8 }, reward: { exp: 500, items: [{ itemId: 'plateArmor', quantity: 1 }], gold: 250 }, levelReq: 8, onComplete: (p) => { p.storyProgress = 'main05'; } },
        main05: { id: 'main05', title: "亡靈的呢喃", npc: "elder", objective: { type: 'kill', target: 'wraith', current: 0, total: 3 }, reward: { exp: 800, items: [{ itemId: 'skillBookLifeDrain', quantity: 1 }], gold: 500 }, levelReq: 11, onComplete: (p) => { p.storyProgress = 'main06'; } },
        main06: { id: 'main06', title: "最終的挑戰", npc: "elder", objective: { type: 'level', target: 'any', current: 0, total: 15 }, reward: { exp: 1500, gold: 1000, skillPoints: 3 }, levelReq: 13, onComplete: (p) => {} },
    },
    storyline: {
        main01: { title: '第一章：低語的先兆', description: '調查橡木鎮水源污染的源頭。' },
        main02: { title: '第二章：磨練自我', description: '學會利用裝備來強化自己。' },
        main03: { title: '第三章：實力證明', description: '透過實戰來證明自己的實力。' },
        main04: { title: '第四章：部落的威脅', description: '擊退入侵的獸人步兵。' },
        main05: { title: '第五章：安撫亡魂', description: '淨化墓園中的怨靈。' },
        main06: { title: '第六章：迎接挑戰', description: '為更艱鉅的挑戰做好準備。' },
    },
    shop: {
        items: ['healingEgg', 'manaTea', 'stoneSkinPotion', 'swiftnessPotion', 'giantsElixir', 'antidote', 'smokeBomb', 'smallSword', 'leatherArmor', 'courageBadge']
    }
};
DATABASE.codex = {
    monsters: Object.keys(DATABASE.monsters),
    items: Object.values(DATABASE.items).filter(i => ['consumable', 'material', 'skillbook'].includes(i.type)).map(i => i.id),
    weapons: Object.values(DATABASE.items).filter(i => i.type === 'weapon').map(i => i.id),
    armors: Object.values(DATABASE.items).filter(i => ['armor', 'accessory'].includes(i.type)).map(i => i.id),
};
let app, db, auth, userId, appId;

const game = {
    state: { player: null, currentScreen: 'start-screen', isFirebaseReady: false, dialogueCallback: null, isRunning: false, lastActionTime: 0, codex: {monsters: [], items: [], weapons: [], armors: []}, canRest: true },

    async init() {
        this.audio.init(); // [新增] 初始化音效
        await this.initFirebase();
        this.ui.showScreen('start-screen');
        this.addEventListeners();
    },

    async initFirebase() {
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        if (!firebaseConfig) { console.error("Firebase config not found!");
            document.getElementById('load-game-btn').disabled = true; return; }
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            onAuthStateChanged(auth, async (user) => {
                if (user) { userId = user.uid; this.state.isFirebaseReady = true; } 
                else { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await signInWithCustomToken(auth, __initial_auth_token); } else { await signInAnonymously(auth); } }
            });
        } catch (error) { console.error("Firebase initialization failed:", error); }
    },
    
    // [修正] 改用事件委派模式 (Sec 3.2)
    addEventListeners() {
        const gameWindow = document.getElementById('game-window');
        
        gameWindow.addEventListener('click', (e) => {
            const target = e.target;

            // [新增] 為所有按鈕點擊播放音效
            if(target.closest('button')) this.audio.playSFX('click');

            const actionButton = target.closest('[data-action]');
            const codexTabButton = target.closest('.codex-tab-button');
            const npcButton = target.closest('.npc-talk-btn');

            // 主選單
            if (target.closest('#start-game-btn')) this.ui.showScreen('char-select-screen');
            if (target.closest('#load-game-btn')) this.saveLoad.load();
            if (target.closest('#show-author-btn')) this.ui.showAuthorModal();
            if (target.closest('#confirm-char-btn')) this.ui.showNameInputModal();
            if (target.closest('.char-card')) {
                document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
                target.closest('.char-card').classList.add('selected');
                document.getElementById('confirm-char-btn').classList.remove('hidden');
            }
            if(target.closest('#continue-to-game-btn')) this.ui.showScreen('hub-screen');

            // Hub
            if(npcButton) this.ui.showNPCDialogue(npcButton.dataset.npcId);
            if(target.closest('#go-adventure-btn')) this.actions.adventure();
            if(target.closest('#rest-btn')) this.actions.rest();
            if(target.closest('#go-shop-btn')) this.actions.shop();
            if(target.closest('#show-codex-btn')) this.actions.showCodexModal();
            if(target.closest('#save-btn')) this.saveLoad.save();
            if(target.closest('#load-btn')) this.saveLoad.showLoadConfirmationModal();
            if(target.closest('#return-to-start-btn')) this.ui.showReturnToStartConfirmation();
            if(target.closest('#gm-mode-btn')) this.ui.showGMPasswordModal();

            // 戰鬥
            if (actionButton && this.state.currentScreen === 'combat-screen') {
                const action = actionButton.dataset.action;
                switch(action) {
                    case 'attack': this.combat.playerAction('attack'); break;
                    case 'skills': this.ui.showSkillTreeModal(true); break;
                    case 'inventory': this.ui.showInventoryModal(true); break;
                    case 'run': this.combat.playerAction('run'); break;
                }
            }

            // 商店
            if (target.closest('#shop-close-btn')) this.ui.showScreen('hub-screen');
            const buyButton = target.closest('#shop-items-container button[data-action="buy"]');
            if (buyButton) {
                const itemId = buyButton.dataset.itemId;
                const itemData = DATABASE.items[itemId];
                if (game.state.player.gold >= itemData.value) {
                    game.state.player.gold -= itemData.value;
                    game.player.addItem(itemId, 1);
                    this.ui.showModal({ title: '購買成功', body: `<p>你購買了 ${itemData.name}。</p>`, buttons: [{ text: '好的', fn: () => this.ui.closeModal() }] });
                    this.ui.updateHubUI();
                } else {
                    this.ui.showModal({ title: '金錢不足', body: '<p>你沒有足夠的金錢購買此物品。</p>', buttons: [{ text: '好的', fn: () => this.ui.closeModal() }] });
                }
            }
            
            // 圖冊
            if (target.closest('#codex-close-btn')) this.ui.closeCodexModal();
            if (codexTabButton) {
                document.querySelectorAll('.codex-tab-button').forEach(b => b.classList.remove('active'));
                codexTabButton.classList.add('active');
                this.ui.renderCodex(codexTabButton.dataset.tab);
            }
        });
    },

    startNewGame(playerName) {
        const selectedClass = document.querySelector('.char-card.selected')?.dataset.class;
        if (!selectedClass) return;
        const classData = DATABASE.classes[selectedClass];
        this.state.player = {
            name: playerName, class: selectedClass, className: classData.name, level: 1, exp: 0,
            expToNext: 80,
            baseStats: { ...classData.stats },
            stats: { ...classData.stats }, maxStats: { ...classData.stats },
            skillPoints: 0,
            attributePoints: 0,
            gold: 100,
            inventory: [{itemId: 'healingEgg', quantity: 3, seen: true}],
            equipment: { weapon: null, armor: null, accessory: null },
            skills: { ...classData.skills },
            quests: {},
            storyProgress: 'main01',
            activeEffects: []
        };
        const startingWeapon = Object.values(DATABASE.items).find(item => item.type === 'weapon' && item.class?.includes(selectedClass) && (item.stats.atk < 5 || item.stats.spi < 7));
        if(startingWeapon) this.state.player.inventory.push({itemId: startingWeapon.id, quantity: 1, seen: true});

        this.player.recalculateStats();
        this.state.player.stats.hp = this.state.player.maxStats.hp;
        this.state.player.stats.mp = this.state.player.maxStats.mp;
        
        this.ui.showStoryScreen(selectedClass);
        this.state.codex = {monsters: [], items: [], weapons: [], armors: []};
        this.state.player.inventory.forEach(i => this.player.addCodexEntryForItem(i.itemId));
    },

    actions: {
        adventure() { game.ui.showWorldMap();
        },
        rest() {
            if (!game.state.player) return;
            if (!game.state.canRest) {
                 game.ui.showModal({ title: '無法休息', body: '<p>你需要先去冒險一次才能再次休息。</p>', buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }] });
                return;
            }
            const p = game.state.player;
            const hpHeal = Math.floor(p.maxStats.hp * 0.3);
            const mpHeal = Math.floor(p.maxStats.mp * 0.3);
            p.stats.hp = Math.min(p.maxStats.hp, p.stats.hp + hpHeal);
            p.stats.mp = Math.min(p.maxStats.mp, p.stats.mp + mpHeal);
            game.state.canRest = false;
            game.ui.updateHubUI();
            game.ui.showModal({ title: '休息完畢', body: `<p>你恢復了 ${hpHeal} 生命和 ${mpHeal} 法力。</p>`, buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }] });
        },
        shop() {
            game.ui.showScreen('shop-screen');
        },
    },

    player: {
        addExp(amount) {
            if (!game.state.player || amount <= 0) return;
            const p = game.state.player;
            p.exp += amount;
            let leveledUp = false;
            while (p.exp >= p.expToNext) { this.levelUp(); leveledUp = true;
            }
            if (leveledUp) {
                setTimeout(() => {
                    game.ui.showModal({ title: '等級提升！', body: `<p>你升到了 ${p.level} 級！你的能力已完全恢復並獲得了提升！</p>`, buttons: [{text: '太棒了！', fn: () => game.ui.closeModal()}] });
                }, 500);
            }
        },
        levelUp() {
            const p = game.state.player;
            p.exp -= p.expToNext;
            p.level++;
            p.expToNext = Math.floor(80 * Math.pow(p.level, 1.4));
            
            p.skillPoints += 1;
            p.attributePoints += 3;
            const growth = {
                swordsman: { hp: 12, mp: 4, atk: 3, def: 2, spi: 1, hit: 1, eva: 0.5, speed: 0.5 },
                monk: { hp: 8, mp: 10, atk: 1, def: 1.5, spi: 3, hit: 1, eva: 1, speed: 1 },
                orc: { hp: 15, mp: 3, atk: 3, def: 3, spi: 0.5, hit: 0.5, eva: 0.2, speed: 0.3 },
                necromancer: { hp: 6, mp: 12, atk: 0.5, def: 1, spi: 4, hit: 1.2, eva: 1.5, speed: 1.2 },
            };
            const classGrowth = growth[p.class];
            for(const stat in classGrowth) {
                p.baseStats[stat] += classGrowth[stat];
            }
            
            this.recalculateStats();
            p.stats.hp = p.maxStats.hp; p.stats.mp = p.maxStats.mp;
            game.quests.advance('level', 'any');
            game.audio.playSFX('level_up'); // [新增] 升級音效
        },
        recalculateStats() {
            const p = game.state.player;
            if(!p) return;
            p.maxStats = { ...p.baseStats };
            
            // 裝備加成
            for(const slot in p.equipment) {
                if (p.equipment[slot]) {
                    const item = DATABASE.items[p.equipment[slot]];
                    if (item.stats) {
                        for(const stat in item.stats) { 
                            p.maxStats[stat] += item.stats[stat];
                        }
                    }
                }
            }

            // [修正] 狀態效果 (Buff/Debuff) 加成 (Sec 2.4)
            const statBuffs = {};
            p.activeEffects.forEach(effect => {
                if (effect.stat && effect.value) {
                    statBuffs[effect.stat] = (statBuffs[effect.stat] || 0) + effect.value;
                }
            });
            for (const stat in statBuffs) {
                p.maxStats[stat] += statBuffs[stat];
            }

            // 衍生屬性計算
            p.maxStats.mp = p.maxStats.mp + Math.floor(p.maxStats.spi * 1.5);
            for(const stat in p.maxStats) {
                p.maxStats[stat] = Math.round(p.maxStats[stat]);
            }

            p.stats.hp = Math.min(p.stats.hp, p.maxStats.hp);
            p.stats.mp = Math.min(p.stats.mp, p.maxStats.mp);
        },
        addItem(itemId, quantity) {
            const p = game.state.player;
            const existingItem = p.inventory.find(i => i.itemId === itemId);
            if (existingItem) { 
                existingItem.quantity += quantity;
                existingItem.seen = false;
            } 
            else { p.inventory.push({ itemId, quantity, seen: false });
            }
            this.addCodexEntryForItem(itemId);
            game.ui.updateHubUI();
        },
        addCodexEntryForItem(itemId, type) {
            const itemData = DATABASE.items[itemId];
            if(type === 'monsters' && game.state.codex.monsters && !game.state.codex.monsters.includes(itemId)) {
                game.state.codex.monsters.push(itemId);
                return;
            }
            if (!itemData) return;
            let itemType;
            if (itemData.type === 'weapon') itemType = 'weapons';
            else if (['armor', 'accessory'].includes(itemData.type)) itemType = 'armors';
            else itemType = 'items';
            if (game.state.codex[itemType] && !game.state.codex[itemType].includes(itemId)) {
                game.state.codex[itemType].push(itemId);
            }
        },
        useItem(itemId, isCombat) {
            const p = game.state.player;
            const itemStack = p.inventory.find(i => i.itemId === itemId);
            if (!itemStack) return false;
            const itemData = DATABASE.items[itemId];
            
            let effectApplied = false;
            if (itemData.type === 'skillbook') {
                if (isCombat) { game.ui.showModal({ title: '無法使用', body: '<p>戰鬥中無法學習技能。</p>', buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }]});
                    return false; }
                if (p.skills[itemData.skillId] && p.skills[itemData.skillId] >= DATABASE.skills[itemData.skillId].maxLevel) {
                    game.ui.showModal({ title: '無法使用', body: '<p>你已學會此技能的最高等級。</p>', buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }]});
                    return false;
                }
                p.skills[itemData.skillId] = (p.skills[itemData.skillId] || 0) + 1;
                game.ui.showModal({ title: '學習成功', body: `<p>你學會了 ${DATABASE.skills[itemData.skillId].name}！</p>`, buttons: [{ text: '好的', fn: () => game.ui.closeModal() }]});
                effectApplied = true;
            } else if (itemData.type === 'consumable') {
                if (itemData.combatOnly && !isCombat) {
                    game.ui.showModal({title: '無法使用', body: '<p>此道具只能在戰鬥中使用。</p>', buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }]});
                    return false;
                }
                const effect = itemData.effect;
                switch(effect.type) {
                    case 'heal_hp': 
                        p.stats.hp = Math.min(p.maxStats.hp, p.stats.hp + effect.value);
                        if (isCombat) {
                            game.vfx.play('heal', document.getElementById('unit-display-player'));
                            game.ui.showCombatLogMessage(`${p.name} 恢復了 ${effect.value} 點生命。`, 'text-green-400');
                        }
                        break;
                    case 'heal_mp': 
                        p.stats.mp = Math.min(p.maxStats.mp, p.stats.mp + effect.value);
                         if (isCombat) game.ui.showCombatLogMessage(`${p.name} 恢復了 ${effect.value} 點法力。`, 'text-blue-400');
                        break;
                    // [修正] 實現 buff 藥水效果 (Sec 2.4)
                    case 'buff':
                        if (isCombat) {
                           game.combat.applyEffect(p, { ...effect });
                           game.ui.showCombatLogMessage(`${p.name} 的 ${LOCALIZATION_MAP.stats[effect.stat]} 提升了！`, 'text-yellow-400');
                        } else {
                           // 非戰鬥中暫不實現
                        }
                        break;
                    case 'escape':
                        if (isCombat) game.combat.playerAction('run', true); // true for guaranteed escape
                        break;
                    case 'cure':
                        // TODO: 實現異常狀態解除
                        break;
                }
                effectApplied = true;
            } else {
                 return false;
            }
            if(effectApplied){
                itemStack.quantity--;
                if (itemStack.quantity <= 0) { p.inventory = p.inventory.filter(i => i.itemId !== itemId);
                }
                game.ui.updateHubUI();
            }
            return effectApplied;
        },
        equipItem(itemId) {
            const p = game.state.player;
            const itemData = DATABASE.items[itemId];
            if (!itemData || !['weapon', 'armor', 'accessory'].includes(itemData.type)) return;
            const canEquip = !itemData.class || itemData.class.includes(p.class);
            if (!canEquip) { game.ui.showModal({title: "無法裝備", body: "<p>你的職業無法使用此物品。</p>", buttons: [{text: '關閉', fn: () => game.ui.closeModal()}]}); return false;
            }
            const itemStack = p.inventory.find(i => i.itemId === itemId);
            if (!itemStack) return false;
            
            if (p.equipment[itemData.slot]) { this.unequipItem(itemData.slot); }
            p.equipment[itemData.slot] = itemId;
            itemStack.quantity--;
            if (itemStack.quantity <= 0) { p.inventory = p.inventory.filter(i => i.itemId !== itemId);
            }
            this.recalculateStats();
            game.quests.advance('equip', 'any');
            this.addCodexEntryForItem(itemId);
            game.ui.updateHubUI();
            return true;
        },
        unequipItem(slot) {
            const p = game.state.player;
            const itemId = p.equipment[slot];
            if (itemId) { this.addItem(itemId, 1); p.equipment[slot] = null; this.recalculateStats();
            }
            game.ui.updateHubUI();
            return true;
        }
    },

    quests: {
        accept(questId) {
            const p = game.state.player;
            if (p.quests[questId]) return;
            
            const questData = DATABASE.quests[questId];
            if (p.level < questData.levelReq) {
                 game.ui.showModal({ title: '時機未到', body: `<p>你的等級不足以接受此任務。</p>`, buttons: [{ text: '好的', fn: () => game.ui.closeModal() }]});
                return;
            }
            
            p.quests[questId] = { ...questData.objective, status: 'active' };
            game.ui.updateHubUI();
            game.ui.showModal({ title: '新任務', body: `<p>你接受了任務: ${questData.title}</p>`, buttons: [{text: '好的', fn: () => game.ui.closeModal()}]});
        },
        advance(type, target) {
            const p = game.state.player;
            for (const questId in p.quests) {
                const quest = p.quests[questId];
                if (quest.status === 'active' && quest.type === type && (quest.target === target || quest.target === 'any')) {
                     if (quest.current < quest.total) {
                        quest.current++;
                     }
                    if(quest.current >= quest.total) {
                        quest.status = 'completed';
                        game.ui.showModal({ title: '任務目標達成！', body: `<p>你完成了任務目標: ${DATABASE.quests[questId].title}！回去找NPC回報吧。</p>`, buttons: [{text: '好的', fn: () => game.ui.closeModal()}]});
                    }
                    game.ui.updateHubUI();
                }
            }
        },
        isComplete(questId) {
            const questState = game.state.player.quests[questId];
            return questState && questState.status === 'completed';
        },
        giveReward(questId) {
            const p = game.state.player;
            const questData = DATABASE.quests[questId];
            if (!questData) return;
            let rewardHTML = '';
            if (questData.reward.exp) { 
                game.player.addExp(questData.reward.exp);
                rewardHTML += `<p>經驗值: ${questData.reward.exp}</p>`;
            }
            if (questData.reward.items) { 
                questData.reward.items.forEach(item => {
                    game.player.addItem(item.itemId, item.quantity); 
                    rewardHTML += `<p>${DATABASE.items[item.itemId].name} x${item.quantity}</p>`;
                });
            }
            if (questData.reward.gold) { 
                p.gold += questData.reward.gold;
                rewardHTML += `<p>金錢: ${questData.reward.gold}</p>`;
            }
            if (questData.reward.skillPoints) {
                p.skillPoints += questData.reward.skillPoints;
                rewardHTML += `<p>技能點: ${questData.reward.skillPoints}</p>`;
            }
            
            if (questData.onComplete) { questData.onComplete(p);
            }
            delete p.quests[questId];
            game.ui.showModal({
                title: '任務完成！',
                body: `<p>你完成了任務 "${questData.title}"！</p><hr class="my-2 border-gray-600"><p>獲得獎勵：</p>${rewardHTML}`,
                buttons: [{ text: '好的', fn: () => { game.ui.closeModal(); game.ui.updateHubUI(); } }]
            });
        }
    },

    combat: {
        state: { enemies: [], defeatedEnemiesInCombat: [], turnOrder: [], turnIndex: 0, actionInProgress: false },
        
        startEncounter(locationId) {
            const location = DATABASE.locations[locationId];
            const playerLevel = game.state.player.level;
            const possibleMonsters = location.monsters.map(id => DATABASE.monsters[id]).filter(m => playerLevel >= m.level - 3 && playerLevel <= m.level + 5);
            if (possibleMonsters.length === 0) { game.ui.showModal({title: '空無一人', body: '<p>這片區域暫時沒有合適的敵人。</p>', buttons: [{text: '返回', fn: () => game.ui.closeModal()}]}); return;
            }

            const multiEncounterChance = 0.4 + (playerLevel * 0.02);
            let monsterCount = 1;
            if (Math.random() < multiEncounterChance) {
                monsterCount = Math.random() < 0.7 ? 2 : 3;
            }
            
            const encounterGroup = [];
            for (let i = 0; i < monsterCount; i++) {
                encounterGroup.push(possibleMonsters[Math.floor(Math.random() * possibleMonsters.length)].id);
            }

            if(encounterGroup.length === 0) { game.ui.showModal({title: '空無一人', body: '<p>這片區域暫時沒有敵人。</p>', buttons: [{text: '返回', fn: () => game.ui.closeModal()}]});
                return; }

            const firstMonster = DATABASE.monsters[encounterGroup[0]];
            game.ui.showModal({
                title: '遭遇敵人！', body: `<p>一群 ${firstMonster.name} 擋住了你的去路！</p>`,
                buttons: [{ text: '戰鬥！', fn: () => { 
                    game.ui.closeModal(); 
                    game.combat.start(encounterGroup);
                }}]
            });
        },

        start(enemyIds) {
            if (game.state.isRunning) return;
            game.state.isRunning = true;

            game.state.player.isPlayer = true; // [修改] 為玩家物件添加 isPlayer 標記
            this.state.enemies = enemyIds.map((id, index) => {
                const template = JSON.parse(JSON.stringify(DATABASE.monsters[id]));
                game.player.addCodexEntryForItem(id, 'monsters');
                return { ...template, stats: { ...template.stats }, maxStats: { ...template.stats }, id: `${id}-${index}`, progress: 0, isPlayer: false, activeEffects: [] };
            });
            
            game.state.player.activeEffects = [];
            this.state.defeatedEnemiesInCombat = [];
            this.state.actionInProgress = false;
            
            const playerUnit = { id: 'player', isPlayer: true, unit: game.state.player, progress: 0 };
            const enemyUnits = this.state.enemies.map(e => ({ id: e.id, isPlayer: false, unit: e, progress: 0 }));
            this.state.turnOrder = [playerUnit, ...enemyUnits];
            if (this.state.enemies.length > 0) {
                game.ui.state.playerTarget = this.state.enemies[0].id;
            }

            game.ui.showScreen('combat-screen');
            game.ui.renderCombatants();
            game.ui.showCombatLogMessage('戰鬥開始！', 'text-green-400');
            this.nextTurn();
        },
        
        nextTurn() {
            if (this.state.enemies.length === 0 || game.state.player.stats.hp <= 0) {
                this.end(this.state.enemies.length === 0);
                return;
            }
        
            let nextCombatant = null;
            while (!nextCombatant) {
                this.state.turnOrder.forEach(c => {
                    if (c.unit.stats.hp > 0) {
                        c.progress += c.unit.maxStats.speed;
                    }
                });
        
                this.state.turnOrder.sort((a, b) => b.progress - a.progress);
                if (this.state.turnOrder[0].progress >= 100) {
                    nextCombatant = this.state.turnOrder[0];
                    nextCombatant.progress -= 100;
                }
            }
        
            if (nextCombatant.isPlayer) {
                this.state.actionInProgress = false;
                this.toggleActionButtons(true);
                game.ui.showCombatLogMessage('你的回合。', 'text-cyan-400');
            } else {
                this.toggleActionButtons(false);
                setTimeout(() => this.enemyAction(nextCombatant.unit), 800);
            }
        },

        playerAction(action, option) {
            if (this.state.actionInProgress) return;
            this.state.actionInProgress = true;
            this.toggleActionButtons(false);

            let turnUsed = false;
            let target = this.state.enemies.find(e => e.id === game.ui.state.playerTarget);
            if (!target && this.state.enemies.length > 0) {
                game.ui.state.playerTarget = this.state.enemies[0].id;
                target = this.state.enemies[0];
            }
            
            switch(action) {
                case 'attack': 
                    if(target) { this.executeAttack(game.state.player, target);
                        turnUsed = true; } 
                    break;
                case 'skill':
                    if (this.executeSkill(game.state.player, option, target)) turnUsed = true;
                    break;
                case 'item':
                    if (game.player.useItem(option, true)) { 
                        turnUsed = true;
                    }
                    break;
                case 'run':
                    if (option === true) { // Guaranteed escape from smoke bomb
                        game.ui.showCombatLogMessage('你使用了煙霧彈，成功逃跑了！');
                        this.end(false, true); return;
                    }
                    const playerSpeed = game.state.player.maxStats.speed;
                    const avgEnemySpeed = this.state.enemies.reduce((sum, e) => sum + e.stats.speed, 0) / this.state.enemies.length;
                    const fleeChance = 0.5 + (playerSpeed - avgEnemySpeed) * 0.02;
                    if (Math.random() < fleeChance) { 
                        game.ui.showCombatLogMessage('你成功逃跑了！');
                        this.end(false, true); return;
                    } else { 
                        game.ui.showCombatLogMessage('逃跑失敗！');
                        turnUsed = true;
                    }
                    break;
            }

            if (!turnUsed) { 
                this.state.actionInProgress = false;
                this.toggleActionButtons(true); return; 
            }

            setTimeout(() => this.processTurnEnd(), 1000);
        },
        enemyAction(enemy) {
            game.ui.showCombatLogMessage(`${enemy.name} 的回合。`, 'text-yellow-400');
            const target = game.state.player;
            const usableSkills = enemy.skills.filter(id => {
                const skill = DATABASE.skills[id];
                if (!skill) return false;
                const cost = skill.levels ? skill.levels[0].mpCost : skill.mpCost;
                return !cost || cost <= enemy.stats.mp;
            });
            if (usableSkills.length > 0 && Math.random() < 0.4) {
                const skillId = usableSkills[Math.floor(Math.random() * usableSkills.length)];
                this.executeSkill(enemy, skillId, target);
            } else {
                this.executeAttack(enemy, target);
            }
            setTimeout(() => this.processTurnEnd(), 1000);
        },
        processTurnEnd() {
            // Tick down effects for all combatants
            const allCombatants = [game.state.player, ...this.state.enemies];
            allCombatants.forEach(unit => {
                if (unit.stats.hp > 0 && unit.activeEffects.length > 0) {
                    unit.activeEffects.forEach(effect => effect.turns--);
                    unit.activeEffects = unit.activeEffects.filter(effect => effect.turns > 0);
                    if (unit.isPlayer) game.player.recalculateStats();
                }
            });


            const defeatedThisTurn = this.state.enemies.filter(e => e.stats.hp <= 0 && !this.state.defeatedEnemiesInCombat.find(d => d.id === e.id));
            defeatedThisTurn.forEach(e => this.state.defeatedEnemiesInCombat.push(e));
            this.state.enemies = this.state.enemies.filter(e => e.stats.hp > 0);
            
            this.state.turnOrder = this.state.turnOrder.filter(c => c.unit.stats.hp > 0);
            if (this.state.enemies.length > 0) {
                if (!this.state.enemies.find(e => e.id === game.ui.state.playerTarget)) {
                    game.ui.state.playerTarget = this.state.enemies[0].id;
                }
            } else {
                game.ui.state.playerTarget = null;
            }
            
            game.ui.renderCombatants();
            if (this.state.enemies.length === 0 || game.state.player.stats.hp <= 0) { 
                this.end(this.state.enemies.length === 0);
            } else { 
                this.nextTurn();
            }
        },
        toggleActionButtons(enabled) { document.querySelectorAll('#combat-action-area button').forEach(btn => btn.disabled = !enabled);
        },
        executeAttack(attacker, defender, multiplier = 1.0, isSkill = false, isMagical = false) {
            const hitRate = 80 + (attacker.maxStats.hit * 1.5) - (defender.maxStats.eva * 1.0);
            const finalHitChance = Math.max(10, Math.min(95, hitRate));

            if (Math.random() * 100 > finalHitChance) {
                game.ui.showCombatLogMessage(`${attacker.name} 的攻擊被 ${defender.name} 閃避了！`, 'text-gray-400');
                return;
            }
            
            let damage;
            let attackerName = attacker.isPlayer ? attacker.name : attacker.name;
            let defenderName = defender.isPlayer ? defender.name : defender.name;
            
            // 混合職業普攻傷害調整
            if (!isSkill) {
                if (attacker.class === 'necromancer') {
                    damage = Math.round(attacker.maxStats.atk * 0.2 + attacker.maxStats.spi * 0.7);
                    isMagical = true;
                } else if (attacker.class === 'monk') {
                    damage = Math.round(attacker.maxStats.atk * 0.5 + attacker.maxStats.spi * 0.6);
                    isMagical = true;
                }
            }

            if (damage === undefined) {
                const attackStat = isMagical ? attacker.maxStats.spi : attacker.maxStats.atk;
                const defenseStat = isMagical ? defender.maxStats.spi : defender.maxStats.def;
                damage = Math.round(attackStat * (attackStat / (attackStat + defenseStat)));
            }
            
            damage = Math.max(1, Math.round(damage * multiplier));
            this.applyDamage(attacker, defender, damage, isMagical);
        },
        executeSkill(attacker, skillId, target) {
            const skillData = DATABASE.skills[skillId];
            if (!skillData) { return false; }
            
            const currentLevel = attacker.isPlayer ? (attacker.skills?.[skillId] || 1) : 1;
            const skillInfo = skillData.levels?.[currentLevel - 1] || {};
            const mpCost = skillInfo.mpCost || 0;
            const hpCostPercent = skillInfo.hpCost || 0;
            const hpCost = Math.round(attacker.maxStats.hp * hpCostPercent);
            if (attacker.stats.mp < mpCost || attacker.stats.hp <= hpCost) {
                if (attacker.isPlayer) game.ui.showCombatLogMessage('資源不足！', 'text-red-500');
                return false;
            }
            
            attacker.stats.mp -= mpCost;
            attacker.stats.hp -= hpCost;
            
            const attackerName = attacker.isPlayer ? attacker.name : attacker.name;
            game.ui.showCombatLogMessage(`${attackerName} 使用了 ${skillData.name}！`, 'text-yellow-400');

            let targets = [];
            if (skillData.targetType === 'single') {
                targets = target ? [target] : [];
            // [修正] 範圍技能目標陣列使用淺拷貝 (Sec 1.5)
            } else if (skillData.targetType === 'all') {
                targets = attacker.isPlayer ? [...this.state.enemies.filter(e => e.stats.hp > 0)] : [game.state.player];
            } else if (skillData.targetType === 'self') {
                targets = [attacker];
            }
            
            const isMagical = skillData.type.includes('magical');
            
            if (skillData.type.includes('physical') || skillData.type.includes('magical')) {
                // [修正] 程式碼加固，確保 damageMultiplier 有預設值 (Sec 1.3)
                const damageMultiplier = skillInfo.damageMultiplier ?? 1.0;
                targets.forEach(t => {
                    this.executeAttack(attacker, t, damageMultiplier, true, isMagical);
                });
            } else if (skillData.type === 'heal_attack') {
                const healAmount = Math.round(attacker.maxStats.spi * (skillInfo.healRatio || 0.5));
                attacker.stats.hp = Math.min(attacker.maxStats.hp, attacker.stats.hp + healAmount);
                game.ui.showCombatLogMessage(`${attackerName} 恢復了 ${healAmount} 點生命！`, 'text-green-400');
                game.vfx.play('heal', document.getElementById(`unit-display-${attacker.id || 'player'}`));
                const damage = Math.round(healAmount * (skillInfo.attackRatio || 0.5));
                const enemyTargets = attacker.isPlayer ? this.state.enemies.filter(e => e.stats.hp > 0) : [game.state.player];
                enemyTargets.forEach(t => this.applyDamage(attacker, t, damage, true));
            } else if (skillData.type === 'buff' || skillData.type === 'debuff') {
                targets.forEach(t => {
                    this.applyEffect(t, { ...skillInfo.effect });
                });
                game.ui.showCombatLogMessage(`${targets.map(t => t.name).join(', ')}受到了 ${skillData.name} 的影響！`, 'text-yellow-400');
            }
            
            return true;
        },
        applyEffect(target, effect) {
            // 簡易實現：不處理疊加，直接替換同 id 的效果
            const existingEffectIndex = target.activeEffects.findIndex(e => e.id === effect.id);
            if (existingEffectIndex > -1) {
                target.activeEffects[existingEffectIndex] = effect;
            } else {
                target.activeEffects.push(effect);
            }
            if (target.isPlayer) {
                game.player.recalculateStats();
            }
        },
        applyDamage(attacker, defender, damage, isMagical) {
            // 防禦 NaN 污染
            if (isNaN(damage)) {
                console.error("NaN damage detected. Attacker:", attacker, "Defender:", defender);
                damage = 1;
            }
            const oldHp = defender.stats.hp;
            const isCrit = (attacker.maxStats.critRate || 0) > Math.random() * 100;
            if (isCrit) damage = Math.round(damage * (attacker.maxStats.critDamage / 100));
            defender.stats.hp = Math.max(0, defender.stats.hp - damage);
            const attackerName = attacker.isPlayer ? attacker.name : attacker.name;
            const defenderName = defender.isPlayer ? defender.name : defender.name;
            
            game.vfx.play('slash', document.getElementById(`unit-display-${defender.id || 'player'}`));
            game.audio.playSFX('attack_hit'); // [新增] 攻擊命中音效
            
            if (isCrit) game.ui.showCombatLogMessage(`💥 暴擊！ ${attackerName} 對 ${defenderName} 造成了 ${damage} 點傷害。`, 'text-red-500 font-bold');
            else game.ui.showCombatLogMessage(`${attackerName} 對 ${defenderName} 造成了 ${damage} 點傷害。`, isMagical ? 'text-purple-400' : 'text-red-400');

            game.ui.updateUnitHP(defender, oldHp);
            if (defender.stats.hp <= 0) game.ui.showCombatLogMessage(`${defenderName} 被擊敗了！`, 'text-gray-400');
        },
        end(win, fled = false) {
            this.state.actionInProgress = false;
            this.toggleActionButtons(true);
            game.state.isRunning = false;
            game.state.canRest = true;
            game.state.player.activeEffects = []; // 清除戰鬥狀態
            game.player.recalculateStats();

            game.audio.stopBGM(); // [新增] 停止戰鬥音樂

            if (fled) { setTimeout(() => game.ui.showScreen('hub-screen'), 1500); return;
            }
            if (win) {
                game.audio.playSFX('win'); // [新增] 勝利音效
                let totalExp = 0;
                let loot = {};
                
                this.state.defeatedEnemiesInCombat.forEach(enemy => {
                    const originalEnemy = DATABASE.monsters[enemy.id.split('-')[0]];
                    totalExp += originalEnemy.exp;
                    game.quests.advance('kill', originalEnemy.id);
                    
                    const dropTable = DATABASE.dropTables[originalEnemy.dropsId] || [];
                    dropTable.forEach(drop => {
                        if (drop.class && !drop.class.includes(game.state.player.class)) return;
                        if (Math.random() < drop.chance) {
                            const quantity = Math.floor(Math.random() * (drop.quantity[1] - drop.quantity[0] + 1)) + drop.quantity[0];
                            if(drop.isMoney) {
                                game.state.player.gold += quantity;
                                loot['gold'] = (loot['gold'] || 0) + quantity;
                            } else {
                                game.player.addItem(drop.itemId, quantity);
                                loot[drop.itemId] = (loot[drop.itemId] || 0) + quantity;
                                game.quests.advance('collect', drop.itemId);
                            }
                        }
                    });
                });

                if (this.state.defeatedEnemiesInCombat.length > 1) {
                    totalExp = Math.floor(totalExp * 1.5);
                }
                
                game.player.addExp(totalExp);
                let lootHTML = Object.keys(loot).map(itemId => {
                    if (itemId === 'gold') return `<p>金錢: ${loot[itemId]}</p>`;
                    return `<p>${DATABASE.items[itemId].name} x${loot[itemId]}</p>`;
                }).join('') || '<p>沒有獲得任何物品。</p>';

                game.ui.showModal({
                    title: '<span class="text-green-400">戰鬥勝利！</span>', body: `<p class="text-yellow-400">獲得經驗值: ${totalExp}</p><hr class="my-2 border-gray-600"> ${lootHTML}`,
                    buttons: [{ text: '繼續', fn: () => { game.ui.closeModal(); game.ui.showScreen('hub-screen'); } }]
                });
            } else { 
                game.audio.playSFX('lose'); // [新增] 失敗音效
                game.ui.showModal({ 
                    title: '你被擊敗了...', 
                    body: '<p>你的冒險到此為止。</p>', 
                    buttons: [
                        { text: '讀取存檔', fn: () => { game.ui.closeModal(); game.saveLoad.load(); } },
                        { text: '回到主選單', fn: () => window.location.reload(), class: 'bg-red-600 hover:bg-red-700 text-white' }
                    ]
                });
            }
        }
    },

    vfx: {
        play(effect, targetElement) {
            if (!targetElement) return;
            const rect = targetElement.getBoundingClientRect();
            const container = document.getElementById('vfx-container');
            const containerRect = container.getBoundingClientRect();
            const vfxEl = document.createElement('div');
            if (effect === 'slash') { vfxEl.className = 'vfx-slash'; } 
            else if (effect === 'heal') { vfxEl.className = 'vfx-heal';
            }
            
            vfxEl.style.left = `${rect.left - containerRect.left + rect.width / 2}px`;
            vfxEl.style.top = `${rect.top - containerRect.top + rect.height / 2}px`;
            
            container.appendChild(vfxEl);
            setTimeout(() => vfxEl.remove(), 1000);
        }
    },

    ui: {
        state: { playerTarget: null },
        showScreen(screenId) {
            document.querySelectorAll('.game-window > div:not(#modal-container)').forEach(div => div.classList.add('hidden'));
            document.getElementById(screenId)?.classList.remove('hidden');
            game.state.currentScreen = screenId;
            if (screenId === 'char-select-screen') this.renderCharSelect();
            if (screenId === 'hub-screen') { 
                document.getElementById('game-container').classList.add('bg-hub');
                document.getElementById('game-container').classList.remove('bg-combat');
                this.renderHub(); 
                game.audio.playBGM('hub'); // [新增] 播放主城音樂
            }
            if (screenId === 'shop-screen') { 
                this.renderShop();
            }
            if (screenId === 'combat-screen') {
                document.getElementById('game-container').classList.remove('bg-hub');
                document.getElementById('game-container').classList.add('bg-combat');
                game.audio.playBGM('combat'); // [新增] 播放戰鬥音樂
            }
            if(screenId === 'start-screen'){
                game.audio.stopBGM(); // [新增] 停止所有音樂
            }
        },
        renderHub() {
            this.updateHubUI();
            const hubContent = document.getElementById('hub-main-content');
            
            let npcButtons = '';
            for(const npcId in DATABASE.npcs) {
                const npc = DATABASE.npcs[npcId];
                npcButtons += `<button data-npc-id="${npcId}" class="npc-talk-btn menu-button w-full py-3">與${npc.name}對話</button>`;
            }

            hubContent.innerHTML = `
                <h2 class="text-3xl md:text-4xl font-bold mb-4">橡木鎮</h2>
                <p class="text-gray-400 mb-8 text-center">${DATABASE.locations.oakwood.description}</p>
                <div class="grid grid-cols-1 gap-4 w-full max-w-sm">
                    ${npcButtons}
                    <button id="go-adventure-btn" class="menu-button w-full py-3">離開村莊</button>
                    <button id="rest-btn" class="menu-button w-full py-3">休息</button>
                    <button id="go-shop-btn" class="menu-button w-full py-3">進入商店</button>
                    <button id="show-codex-btn" class="menu-button w-full py-3">冒險圖冊</button>
                    <button id="save-btn" class="menu-button w-full py-3">雲端存檔</button>
                    <button id="load-btn" class="menu-button w-full py-3">雲端讀檔</button>
                    <button id="return-to-start-btn" class="menu-button w-full py-3 bg-red-800/50 hover:bg-red-700/80">回到主選單</button>
                </div>
                <p id="gm-mode-btn" class="text-gray-600 text-xs mt-auto cursor-pointer">VER.1.4 (已修正)</p>
            `;
        },
        renderShop() {
            const container = document.getElementById('shop-items-container');
            container.innerHTML = '';
            DATABASE.shop.items.forEach(itemId => {
                const itemData = DATABASE.items[itemId];
                const itemCard = document.createElement('div');
                itemCard.className = `p-2 rounded-lg bg-black bg-opacity-20 flex flex-col justify-between items-center text-center text-sm ${itemData.rarity === 'epic' ? 'border-2 border-purple-500 shadow-lg shadow-purple-500/50' : 'border border-gray-600'}`;
                
                itemCard.innerHTML = `
                    <h3 class="font-bold">${itemData.name}</h3>
                    <p class="text-xs text-gray-400 mt-1">${itemData.description}</p>
                    <p class="text-yellow-400 font-bold mt-auto">${itemData.value} 金</p>
                    <button data-item-id="${itemId}" data-action="buy" class="menu-button mt-2 px-2 py-1">購買</button>
                `;
                container.appendChild(itemCard);
            });
        },
        showReturnToStartConfirmation() {
            this.showModal({
                title: '確定返回主選單？',
                body: '<p class="text-gray-400">所有未儲存的進度將會遺失。</p>',
                buttons: [
                    { text: '取消', fn: () => this.closeModal() },
                    { text: '確定', fn: () => { this.closeModal(); window.location.reload(); }, class: 'bg-red-600 hover:bg-red-700 text-white' }
                ]
            });
        },
        showWorldMap() {
            let locationsHTML = '';
            const storyIndex = Object.keys(DATABASE.storyline).indexOf(game.state.player.storyProgress);

            for (const locId in DATABASE.locations) {
                const loc = DATABASE.locations[locId];
                if (locId === 'oakwood') continue;
                
                const locStoryIndex = Object.keys(DATABASE.storyline).indexOf(loc.storyReq || 'main01');
                const isDisabled = storyIndex < locStoryIndex;
                const buttonClasses = `menu-button w-full text-left p-4 rounded-lg flex items-center justify-between ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`;
                const levelText = isDisabled ? `<span class="text-sm text-red-400"> (故事未解鎖)</span>` : `<span class="text-sm text-gray-400">(Lv.${loc.levelRange[0]}+)</span>`;
                
                locationsHTML += `<button data-loc-id="${locId}" class="${buttonClasses}" ${isDisabled ? 'disabled' : ''}>
                    <div><h4 class="font-bold text-lg">${loc.name} ${levelText}</h4><p class="text-sm text-gray-400">${loc.description}</p></div>
                </button>`;
            }
            this.showModal({
                title: '世界地圖', body: `<p>選擇你要前往的目的地。</p><div class="mt-4 space-y-2">${locationsHTML}</div>`,
                buttons: [{ text: '返回城鎮', fn: () => this.closeModal()}]
            });
            document.querySelectorAll('#modal-container button[data-loc-id]').forEach(btn => {
                btn.addEventListener('click', (e) => { 
                    const locId = e.currentTarget.dataset.locId;
                    this.closeModal();
                    setTimeout(() => game.combat.startEncounter(locId), 300);
                });
            });
        },
        // [修正] 重構 NPC 對話與任務處理邏輯 (Sec 4.1)
        showNPCDialogue(npcId) {
            const p = game.state.player;
            const npc = DATABASE.npcs[npcId];
            if (!npc) return;

            let dialogueKey = 'default';
            let buttons = [];

            // 1. 優先查找可提交的任務
            const completableQuestId = Object.keys(p.quests).find(id => 
                DATABASE.quests[id].npc === npcId && p.quests[id].status === 'completed'
            );

            if (completableQuestId) {
                dialogueKey = 'questComplete';
                buttons.push({ text: "這是我的榮幸", fn: () => { game.quests.giveReward(completableQuestId); } });
            } else {
                // 2. 其次查找進行中的任務
                const activeQuestId = Object.keys(p.quests).find(id => 
                    DATABASE.quests[id].npc === npcId && p.quests[id].status === 'active'
                );
                if (activeQuestId) {
                    dialogueKey = 'questInProgress';
                    buttons.push({ text: "我會盡快", fn: () => this.closeModal() });
                } else {
                    // 3. 最後查找可接取的任務
                    const nextQuestId = Object.keys(DATABASE.quests).find(id => 
                        DATABASE.quests[id].npc === npcId && !p.quests[id] && p.storyProgress === id
                    );

                    if (nextQuestId) {
                        const questData = DATABASE.quests[nextQuestId];
                        if (p.level >= questData.levelReq) {
                            dialogueKey = 'start';
                            const targetName = DATABASE.monsters[questData.objective.target]?.name || '目標';
                            buttons.push({ text: "我該怎麼做？", fn: () => {
                                this.showModal({ 
                                    title: npc.name, 
                                    body: `<p>請你去擊敗 ${questData.objective.total} 隻 ${targetName}。</p>`, 
                                    buttons: [{ text: "交給我吧", fn: () => { game.quests.accept(nextQuestId); this.closeModal(); }}]
                                });
                            }});
                            buttons.push({text: "我再考慮一下", fn: () => this.closeModal()});
                        } else {
                            dialogueKey = 'levelTooLow';
                            buttons.push({text: "我明白了", fn: () => this.closeModal()});
                        }
                    } else {
                         dialogueKey = 'postQuest';
                         buttons.push({ text: "再會", fn: () => this.closeModal() });
                    }
                }
            }

            const dialogues = {
                elder: {
                    start: "年輕的旅人，歡迎來到橡木鎮。但恐怕這裡已不再安全...我們需要你的幫助。",
                    questInProgress: "調查有進展了嗎？森林裡很危險，千萬要小心。",
                    questComplete: "你回來了！真是太感謝你了！這點報酬請務必收下。",
                    postQuest: "多虧了你，鎮子周圍安全多了。但我們仍需找出這一切混亂的根源。",
                    levelTooLow: "你似乎還不夠強大，先在鎮子附近歷練一番，等準備好了再來吧。"
                },
                blacksmith: {
                    start: "嘿，年輕人！想打造點什麼嗎？哦？你是來完成任務的？",
                    questInProgress: "還沒裝備上像樣的東西嗎？快去背包裡找找！",
                    questComplete: "嗯，不錯，人要衣裝，佛要金裝，冒險者當然需要好裝備！這是給你的獎勵！",
                    postQuest: "隨時歡迎回來，我這裡總有好東西。",
                    levelTooLow: "你的等級還不夠，我沒什麼能教你的。"
                }
            };

            const defaultDialogue = {
                elder: dialogues.elder.postQuest,
                blacksmith: dialogues.blacksmith.postQuest,
            }

            const bodyText = dialogues[npcId]?.[dialogueKey] || defaultDialogue[npcId];
            this.showModal({ title: npc.name, body: `<p>${bodyText}</p>`, buttons });
        },
        showNameInputModal() {
            this.showModal({
                title: "為你的冒險者命名",
                body: `<input id="player-name-input" type="text" class="text-input w-full p-2 rounded" placeholder="輸入名字..." maxlength="12">`,
                buttons: [{text: "確定", fn: () => {
                    const name = document.getElementById('player-name-input').value.trim();
                    if (name) { this.closeModal(); game.startNewGame(name); }
                }}]
            });
        },
        // [修改] GM 系統功能
        showGMPasswordModal() {
            this.showModal({
                title: "GM 面板",
                body: `<input id="gm-password-input" type="password" class="text-input w-full p-2 rounded" placeholder="請輸入密碼...">`,
                buttons: [{ text: '確定', fn: () => {
                    if (document.getElementById('gm-password-input').value === '67712393') {
                        this.closeModal();
                        this.applyGM(); // 直接執行 GM 功能
                    } else {
                        this.closeModal();
                    }
                }}]
            });
        },
        // [修改] GM 系統功能
        applyGM() {
            const p = game.state.player;
            if (!p) return;
            const levelTarget = 50;
            if (p.level >= levelTarget) {
                this.showModal({ title: 'GM指令', body: '<p>你已經達到或超過50級。</p>', buttons: [{ text: '好的', fn: () => this.closeModal() }] });
                return;
            }
            const levelsToGain = levelTarget - p.level;
            for (let i = 0; i < levelsToGain; i++) {
                // 調用現有的 levelUp 函數以確保所有獎勵都正確發放
                game.player.levelUp();
            }
            // 確保最終等級是 50
            p.level = levelTarget;
            game.player.recalculateStats();
            this.updateHubUI();
            this.showModal({ title: 'GM指令', body: `<p>你已成功提升至 ${levelTarget} 級！</p>`, buttons: [{ text: '好的', fn: () => this.closeModal() }] });
        },
        renderCharSelect() {
            const container = document.getElementById('char-cards-container');
            container.innerHTML = '';
            document.getElementById('confirm-char-btn').classList.add('hidden'); 

            for (const classId in DATABASE.classes) {
                const classData = DATABASE.classes[classId];
                const card = document.createElement('div');
                card.className = 'char-card p-4 rounded-lg slide-in cursor-pointer';
                card.dataset.class = classId;
                card.innerHTML = `
                    <div class="card-header">
                        <h3 class="text-2xl font-bold mb-2">${classData.icon}${classData.name}</h3>
                        <p class="text-gray-400 mb-2">${classData.description}</p>
                    </div>
                    <div class="stats-container mt-2">
                        <div class="text-sm font-mono grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-gray-700">
                            <span>攻擊: ${classData.stats.atk}</span><span>防禦: ${classData.stats.def}</span>
                            <span>生命: ${classData.stats.hp}</span><span>靈力: ${classData.stats.spi}</span>
                            <span>速度: ${classData.stats.speed}</span><span>暴擊: ${classData.stats.critRate}%</span>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            }
        },
        showStoryScreen(classId) {
            const classData = DATABASE.classes[classId];
            document.getElementById('story-title').innerText = `啟程 - ${classData.name}`;
            document.getElementById('story-text').innerText = classData.story;
            this.showScreen('story-screen');
        },
        updateHubUI() {
            if (!game.state.player) return;
            game.player.recalculateStats();
            const p = game.state.player;
            const container = document.getElementById('player-and-quest-status-container');

            const classIcon = DATABASE.classes[p.class].icon;
            const expPercent = p.expToNext > 0 ? (p.exp / p.expToNext) * 100 : 0;
            const storyData = DATABASE.storyline[p.storyProgress] || {title: '旅程繼續', description: '繼續你的冒險吧！'};
            
            const storyKeys = Object.keys(DATABASE.storyline);
            const currentStoryIndex = storyKeys.indexOf(p.storyProgress);
            const storyProgressionHTML = storyKeys.map((key, index) => {
                const isCompleted = index < currentStoryIndex;
                const isActive = index === currentStoryIndex;
                let color = 'text-gray-600';
                if (isCompleted) color = 'text-blue-400';
                if (isActive) color = 'text-green-400';
                return `<span class="${color}">${index + 1}</span>`;
            }).join(' - ');
            
            // [修正] 增加 Hit 和 Eva 顯示 (Sec 2.1)
            // [修正] 使用本地化文本 (Sec 3.4)
            const questLog = document.getElementById('hub-quest-log');
            let questHTML = '';
            for (const questId in p.quests) {
                const quest = p.quests[questId];
                const questData = DATABASE.quests[questId];
                const targetName = DATABASE.monsters[quest.target]?.name || quest.target;
                if (quest.status === 'active') {
                    questHTML += `<div class="mt-2"><p class="font-bold text-green-400">${questData.title}</p><p class="text-sm text-gray-400">- ${targetName} (${quest.current}/${quest.total})</p></div>`;
                } else if (quest.status === 'completed') {
                    questHTML += `<div class="mt-2"><p class="font-bold text-yellow-400">${questData.title} (完成)</p><p class="text-sm text-gray-400">- 前往 ${DATABASE.npcs[questData.npc]?.name || ''} 回報</p></div>`;
                }
            }

            container.innerHTML = `
                <div class="scrollable-content">
                    <h3 class="text-xl font-bold mb-2">主線進度</h3>
                    <div class="text-lg font-bold text-center mb-4">${storyProgressionHTML}</div>
                    <div id="hub-story-progress" class="mb-6"><p class="font-bold">${storyData.title}</p><p class="text-sm text-gray-400">${storyData.description}</p></div>
                    
                    <h3 class="text-xl font-bold mb-4">玩家狀態</h3>
                    <div id="hub-player-stats">
                        <p class="text-xl font-bold flex items-center">${classIcon} ${p.name} <span class="text-base text-gray-400 ml-2">Lv.${p.level}</span></p>
                        <div class="mt-4 space-y-2 text-sm">
                            <p>生命: ${p.stats.hp}/${p.maxStats.hp}</p>
                            <div class="hp-bar-container h-2 bg-black/50"><div class="hp-bar-fill" style="width:${p.stats.hp/p.maxStats.hp*100}%"></div></div>
                            <p>法力: ${p.stats.mp}/${p.maxStats.mp}</p>
                            <div class="hp-bar-container h-2 bg-black/50"><div class="mp-bar-fill" style="width:${p.stats.mp > 0 ? (p.stats.mp/p.maxStats.mp*100) : 0}%"></div></div>
                            <p>經驗: ${p.exp}/${p.expToNext}</p>
                            <div class="hp-bar-container h-2 bg-black/50"><div class="exp-bar-fill" style="width:${expPercent}%"></div></div>
                            <hr class="border-gray-600 my-4">
                            <div class="grid grid-cols-2 gap-x-4 gap-y-1">
                                <span>${LOCALIZATION_MAP.stats.atk}: ${p.maxStats.atk}</span><span>${LOCALIZATION_MAP.stats.def}: ${p.maxStats.def}</span>
                                <span>${LOCALIZATION_MAP.stats.spi}: ${p.maxStats.spi}</span><span>${LOCALIZATION_MAP.stats.speed}: ${p.maxStats.speed}</span>
                                <span>${LOCALIZATION_MAP.stats.hit}: ${p.maxStats.hit}</span><span>${LOCALIZATION_MAP.stats.eva}: ${p.maxStats.eva}</span>
                                <span>${LOCALIZATION_MAP.stats.critRate}: ${p.maxStats.critRate}%</span><span>${LOCALIZATION_MAP.stats.critDamage}: ${p.maxStats.critDamage}%</span>
                            </div>
                            <p class="text-yellow-400 font-bold mt-2">金錢: ${p.gold}</p>
                            <div class="flex flex-wrap gap-2 mt-4">
                                <button id="assign-points-btn" class="menu-button text-sm px-2 py-1 ${p.attributePoints > 0 ? '' : 'opacity-50'}">屬性點(${p.attributePoints})</button>
                                <button id="skills-btn" class="menu-button text-sm px-2 py-1 ${p.skillPoints > 0 ? '' : 'opacity-50'}">技能(${p.skillPoints})</button>
                                <div class="relative"><button id="inventory-btn" class="menu-button text-sm px-2 py-1">道具</button></div>
                            </div>
                        </div>
                    </div>
                    <h3 class="text-xl font-bold mt-6 mb-4">任務日誌</h3>
                    <div id="hub-quest-log" class="overflow-y-auto">${questHTML || '<p class="text-gray-500">沒有進行中的任務。</p>'}</div>
                </div>`;
            
            document.getElementById('assign-points-btn')?.addEventListener('click', () => this.showAssignPointsModal());
            document.getElementById('inventory-btn')?.addEventListener('click', () => this.showInventoryModal(false));
            document.getElementById('skills-btn')?.addEventListener('click', () => this.showSkillTreeModal(false));
        },
        renderCombatants() {
            const player = game.state.player;
            const playerArea = document.getElementById('combat-player-area');
            playerArea.innerHTML = `
                <div id="unit-display-player" class="combat-unit p-2 rounded-lg bg-black bg-opacity-20 flex-grow w-full">
                    <p class="font-bold text-sm md:text-base flex items-center justify-center">${DATABASE.classes[player.class].icon}${player.name} <span class="text-xs text-gray-400 ml-1">Lv.${player.level}</span></p>
                    <div class="hp-bar-container mt-1 h-4 bg-black/50"><div id="hp-damage-player" class="hp-bar-damage"></div><div id="hp-fill-player" class="hp-bar-fill"></div></div>
                    <p class="text-xs text-center font-mono">${player.stats.hp}/${player.maxStats.hp}</p>
                    <div class="hp-bar-container mt-1 h-2 bg-black/50"><div class="mp-bar-fill" style="width: ${(player.maxStats.mp > 0 ? player.stats.mp/player.maxStats.mp*100 : 0)}%"></div></div>
                    <p class="text-xs text-center font-mono">${player.stats.mp}/${player.maxStats.mp}</p>
                </div>
                <div class="mt-2 p-2 rounded bg-black/50 text-xs text-center w-full">
                    <div class="grid grid-cols-2 gap-x-2 gap-y-1">
                        <span>${LOCALIZATION_MAP.stats.atk}: ${player.maxStats.atk}</span><span>${LOCALIZATION_MAP.stats.def}: ${player.maxStats.def}</span>
                        <span>${LOCALIZATION_MAP.stats.speed}: ${player.maxStats.speed}</span><span>${LOCALIZATION_MAP.stats.hit}: ${player.maxStats.hit}</span>
                        <span>${LOCALIZATION_MAP.stats.eva}: ${player.maxStats.eva}</span><span>${LOCALIZATION_MAP.stats.critRate}: ${player.maxStats.critRate}%</span>
                    </div>
                </div>
            `;
            this.updateUnitHP(player, player.stats.hp);
            
            const enemyArea = document.getElementById('combat-enemy-area'); enemyArea.innerHTML = '';
            game.combat.state.enemies.forEach(enemy => {
                const enemyDiv = document.createElement('div');
                enemyDiv.innerHTML = this.getUnitHTML(enemy);
                enemyDiv.querySelector('.combat-unit').addEventListener('click', () => {
                    if (!game.combat.state.actionInProgress) { 
                        this.state.playerTarget = enemy.id; this.renderCombatants();
                    }
                });
                enemyArea.appendChild(enemyDiv);
            });
        },
        getUnitHTML(unit) {
            const hpPercent = unit.maxStats.hp > 0 ? (unit.stats.hp / unit.maxStats.hp) * 100 : 0;
            const targetedClass = this.state.playerTarget === unit.id ? 'targeted' : '';
            return `
                <div id="unit-display-${unit.id}" class="combat-unit p-2 rounded-lg ${targetedClass}">
                    <p class="font-bold text-sm md:text-base">${unit.name} <span class="text-xs text-gray-400 ml-1">Lv.${unit.level}</span></p>
                    <div class="hp-bar-container mt-1 h-4 bg-black/50">
                        <div id="hp-damage-${unit.id}" class="hp-bar-damage" style="width: ${hpPercent}%"></div>
                        <div id="hp-fill-${unit.id}" class="hp-bar-fill" style="width: ${hpPercent}%"></div>
                    </div>
                    <p class="text-xs text-center font-mono">${unit.stats.hp}/${unit.maxStats.hp}</p>
                </div>`;
        },
        updateUnitHP(unit, oldHp) {
            const id = unit.id || 'player';
            if(!unit.isPlayer) this.triggerHitEffect(`unit-display-${id}`);
            const oldPercent = (oldHp / unit.maxStats.hp) * 100;
            const newPercent = (unit.stats.hp / unit.maxStats.hp) * 100;
            const damageBar = document.getElementById(`hp-damage-${id}`);
            const fillBar = document.getElementById(`hp-fill-${id}`);
            if(damageBar) damageBar.style.width = `${oldPercent}%`;
            if(fillBar) fillBar.style.width = `${newPercent}%`;
            setTimeout(() => { if(damageBar) damageBar.style.width = `${newPercent}%`; }, 400);
        },
        showCombatLogMessage(message, colorClass = 'text-white') {
            const logBox = document.getElementById('combat-log-box');
            const p = document.createElement('p'); p.className = `${colorClass} slide-in`; p.innerHTML = `> ${message}`;
            logBox.prepend(p); if (logBox.children.length > 20) { logBox.lastChild.remove();
            }
        },
        showModal({ title, body, buttons }) {
            let buttonsHTML = buttons.map((btn, index) => `<button data-btn-index="${index}" class="menu-button px-6 py-2 rounded-lg ${btn.class || ''}">${btn.text}</button>`).join('');
            const contentHTML = `<h3 class="text-2xl font-bold mb-4">${title}</h3><div class="modal-body text-gray-300 modal-scrollable">${body}</div><div class="flex justify-end gap-4 mt-6">${buttonsHTML}</div>`;
            const container = document.getElementById('modal-container');
            container.innerHTML = `<div class="modal-backdrop fade-in"><div class="modal-content slide-in">${contentHTML}</div></div>`;
            container.classList.remove('hidden');
            container.querySelectorAll('button[data-btn-index]').forEach((button, index) => {
                button.addEventListener('click', () => buttons[index].fn());
            });
        },
        closeModal() { document.getElementById('modal-container').classList.add('hidden');
        },
        showAuthorModal() { this.showModal({ title: '作者', body: '<p>陳力航</p><p class="text-gray-400 mt-1">一位擁有大俠夢的人</p>', buttons: [{ text: '返回', fn: () => this.closeModal() }]});
        },
        showInventoryModal(isCombat) {
            if (isCombat) {
                const items = game.state.player.inventory.filter(i => DATABASE.items[i.itemId].type === 'consumable');
                let itemsHTML = items.map(itemStack => {
                    const itemData = DATABASE.items[itemStack.itemId];
                    return `<div class="flex justify-between items-center p-2 bg-black bg-opacity-20 rounded mb-2"><div><p class="font-bold">${itemData.name} x${itemStack.quantity}</p><p class="text-sm text-gray-400">${itemData.description}</p></div><button data-item-id="${itemStack.itemId}" class="menu-button px-4 py-1">使用</button></div>`;
                }).join('') || '<p class="text-gray-400">沒有可用的道具。</p>';
                this.showModal({ 
                    title: '選擇道具', body: `<div class="max-h-64 overflow-y-auto">${itemsHTML}</div>`, 
                    buttons: [{ text: '關閉', fn: () => this.closeModal() }]
                });
                document.querySelectorAll('#modal-container button[data-item-id]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.closeModal();
                        game.combat.playerAction('item', e.currentTarget.dataset.itemId);
                    });
                });
                return;
            }

            const p = game.state.player;
            p.inventory.forEach(i => i.seen = true);
            const render = (tab) => {
                let itemsHTML = '';
                if (tab === 'items') {
                     const items = p.inventory.filter(i => ['consumable', 'material', 'skillbook'].includes(DATABASE.items[i.itemId].type));
                     itemsHTML = items.map(itemStack => {
                         const itemData = DATABASE.items[itemStack.itemId];
                         const buttonHTML = ['consumable', 'skillbook'].includes(itemData.type) ? `<button data-action-type="use" data-item-id="${itemStack.itemId}" class="menu-button px-4 py-1">使用</button>` : '';
                         return `<div class="flex justify-between items-center p-2 bg-black bg-opacity-20 rounded mb-2"><div><p class="font-bold">${itemData.name} x${itemStack.quantity}</p><p class="text-sm text-gray-400">${itemData.description}</p></div>${buttonHTML}</div>`;
                     }).join('') || '<p class="text-gray-400">沒有道具。</p>';
                } else if (tab === 'equipment') {
                    const equipmentInBag = p.inventory.filter(i => ['weapon', 'armor', 'accessory'].includes(DATABASE.items[i.itemId].type));
                    itemsHTML = '';
                    for(const slot in p.equipment) {
                        const itemId = p.equipment[slot];
                        if(itemId) {
                            const itemData = DATABASE.items[itemId];
                            // [修正] 使用本地化文本 (Sec 3.4)
                            const statsHTML = itemData.stats ? `<p class="text-xs text-cyan-400">${Object.entries(itemData.stats).map(([s,v]) => `${LOCALIZATION_MAP.stats[s] || s.toUpperCase()}: ${v}`).join(', ')}</p>` : '';
                            itemsHTML += `<div class="flex justify-between items-center p-2 bg-green-900/30 rounded mb-2"><div><p class="font-bold text-green-400">[已裝備] ${itemData.name}</p>${statsHTML}</div><button data-action-type="unequip" data-slot="${slot}" class="menu-button px-4 py-1">拆除</button></div>`;
                        }
                    }
                    if (equipmentInBag.length > 0) itemsHTML += '<hr class="border-gray-600 my-4">';
                    itemsHTML += equipmentInBag.map(itemStack => {
                        const itemData = DATABASE.items[itemStack.itemId];
                        const statsHTML = itemData.stats ? `<p class="text-xs text-cyan-400">${Object.entries(itemData.stats).map(([s,v]) => `${LOCALIZATION_MAP.stats[s] || s.toUpperCase()}: ${v}`).join(', ')}</p>` : '';
                        return `<div class="flex justify-between items-center p-2 bg-black/20 rounded mb-2"><div><p class="font-bold">${itemData.name} x${itemStack.quantity}</p>${statsHTML}</div><button data-action-type="equip" data-item-id="${itemStack.itemId}" class="menu-button px-4 py-1">裝備</button></div>`;
                    }).join('');
                    if (itemsHTML === '') itemsHTML = '<p class="text-gray-400">沒有可裝備的物品。</p>';
                }
                this.showModal({ 
                    title: '道具背包', body: `<div class="flex border-b-2 border-gray-700 mb-4"><button data-tab="items" class="tab-button flex-1 py-2 ${tab === 'items' ? 'active' : ''}">道具</button><button data-tab="equipment" class="tab-button flex-1 py-2 ${tab === 'equipment' ? 'active' : ''}">裝備</button></div><div id="inventory-content" class="modal-scrollable">${itemsHTML}</div>`, 
                    buttons: [{ text: '關閉', fn: () => this.closeModal() }]
                });
                document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', (e) => render(e.target.dataset.tab)));
                document.querySelectorAll('#inventory-content button').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const { actionType, itemId, slot } = e.currentTarget.dataset;
                        if (actionType === 'use' && game.player.useItem(itemId, false)) render(tab);
                        else if (actionType === 'equip' && game.player.equipItem(itemId)) render(tab);
                        else if (actionType === 'unequip' && game.player.unequipItem(slot)) render(tab);
                    });
                });
            };
            render('equipment');
        },
        showSkillTreeModal(isCombat) {
            const p = game.state.player;
            const classSkills = Object.entries(DATABASE.skills).filter(([id, data]) => data.class === p.class);
            const skillsHTML = classSkills.map(([skillId, skillData]) => {
                const currentLevel = p.skills[skillId] || 0;
                const isMaxLevel = currentLevel >= skillData.maxLevel;
                const levelText = currentLevel > 0 ? ` <span class="text-yellow-400">Lv.${currentLevel}${isMaxLevel ? ' (MAX)' : ''}</span>` : '';
                const skillInfo = skillData.levels[Math.min(currentLevel, skillData.maxLevel) - 1] || skillData.levels[0];
                const prerequisite = skillData.prerequisite;
                const preReqText = prerequisite ? ` (前置: ${DATABASE.skills[prerequisite.skillId].name} Lv.${prerequisite.level})` : '';
                const levelReqText = ` (需要等級: ${skillData.levelReq})`;
                const description = skillInfo.description + (prerequisite ? preReqText : '') + (currentLevel === 0 ? levelReqText : '');


                let buttonHTML = '';
                if (isCombat) {
                    if (currentLevel > 0) buttonHTML = `<button data-skill-id="${skillId}" class="menu-button px-4 py-1">使用</button>`;
                } else {
                    if (currentLevel === 0 && p.skillPoints > 0 && p.level >= skillData.levelReq && (!prerequisite || (p.skills[prerequisite.skillId] >= prerequisite.level))) {
                        buttonHTML = `<button data-action="learn" data-skill-id="${skillId}" class="menu-button px-4 py-1 bg-green-700">學習</button>`;
                    } else if (currentLevel > 0 && !isMaxLevel && p.skillPoints > 0) {
                        buttonHTML = `<button data-action="upgrade" data-skill-id="${skillId}" class="menu-button px-4 py-1">升級</button>`;
                    }
                }
                return `<div class="p-3 bg-black/20 rounded mb-2 ${p.level < skillData.levelReq ? 'opacity-50' : ''}"><div class="flex justify-between items-start"><div><p class="font-bold">${skillData.name}${levelText}</p><p class="text-sm text-gray-400">${description}</p></div><div class="flex-shrink-0 ml-2">${buttonHTML}</div></div></div>`;
            }).join('');
            
            this.showModal({ 
                title: isCombat ? '選擇技能' : '技能', 
                body: `<p class="mb-4 text-lg">剩餘技能點: <span class="font-bold text-yellow-400">${p.skillPoints}</span></p><div class="modal-scrollable">${skillsHTML}</div>`, 
                buttons: [{ text: '關閉', fn: () => this.closeModal() }] 
            });
            document.querySelectorAll('#modal-container button[data-skill-id]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const skillId = e.currentTarget.dataset.skillId;
                    const action = e.currentTarget.dataset.action;
                    if (isCombat) { this.closeModal(); game.combat.playerAction('skill', skillId); }
                    else if (action === 'learn') { p.skills[skillId] = 1; p.skillPoints--; this.showSkillTreeModal(false); }
                    else if (action === 'upgrade') { p.skills[skillId]++; p.skillPoints--; this.showSkillTreeModal(false); }
                });
            });
        },
        showAssignPointsModal() {
            const p = game.state.player;
            const stats = ['atk', 'def', 'spi', 'hit', 'eva', 'speed'];
            let tempPoints = p.attributePoints;
            let tempChanges = {};
            const render = () => {
                const statsHTML = stats.map(stat => `
                    <div class="flex justify-between items-center mb-2">
                        <span class="capitalize font-bold">${LOCALIZATION_MAP.stats[stat]}: ${p.baseStats[stat] + (tempChanges[stat] || 0)}</span>
                        <div>
                         <button data-stat="${stat}" data-change="-1" class="minus-stat-btn menu-button w-8 h-8 ${!tempChanges[stat] || tempChanges[stat] <= 0 ? 'opacity-50' : ''}">-</button>
                         <button data-stat="${stat}" data-change="1" class="plus-stat-btn menu-button w-8 h-8 ${tempPoints <= 0 ? 'opacity-50' : ''}">+</button>
                        </div>
                    </div>`).join('');
                this.showModal({
                    title: '分配屬性點',
                    body: `<p class="mb-4">剩餘點數: <span id="points-left">${tempPoints}</span></p>
                           <div class="mb-4"><label for="add-points-input">一次增加：</label><input type="number" id="add-points-input" class="text-input w-20 p-1 rounded" value="1" min="1"></div>
                           <div class="space-y-2">${statsHTML}</div>`,
                    buttons: [
                        { text: '取消', fn: () => { this.closeModal(); this.updateHubUI(); }},
                        { text: '確定', fn: () => { 
                            for (const stat in tempChanges) p.baseStats[stat] += tempChanges[stat];
                            p.attributePoints = tempPoints;
                            game.player.recalculateStats(); this.closeModal(); this.updateHubUI();
                        }}
                    ]
                });
                document.querySelectorAll('.plus-stat-btn, .minus-stat-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const stat = e.currentTarget.dataset.stat;
                        const changeDirection = parseInt(e.currentTarget.dataset.change);
                        const amount = parseInt(document.getElementById('add-points-input').value) || 1;
                        
                        if (changeDirection > 0 && tempPoints >= amount) {
                            tempPoints -= amount;
                            tempChanges[stat] = (tempChanges[stat] || 0) + amount;
                        } else if (changeDirection < 0 && (tempChanges[stat] || 0) >= amount) {
                            tempPoints += amount;
                            tempChanges[stat] -= amount;
                        }
                        render();
                    });
                });
            }
            render();
        },
        showCodexModal() {
            document.getElementById('codex-modal').classList.remove('hidden');
            document.querySelector('.codex-tab-button[data-tab="monsters"]').click();
        },
        renderCodex(tab) {
            const contentEl = document.getElementById('codex-content');
            const allEntries = DATABASE.codex[tab];
            const knownEntries = game.state.codex[tab] || [];
            const contentHTML = allEntries.map(id => {
                const data = tab === 'monsters' ? DATABASE.monsters[id] : DATABASE.items[id];
                const found = knownEntries.includes(id);
                const title = found ? data.name : '???';
                const description = found ? (tab === 'monsters' ? `Lv.${data.level}` : data.description) : '尚未發現';
                return `<div class="p-2 rounded-lg bg-black/20 border border-gray-600 ${!found ? 'grayscale opacity-50' : ''}"><h4 class="font-bold">${title}</h4><p class="text-xs text-gray-400">${description}</p></div>`;
            }).join('');
            contentEl.innerHTML = `<div class="grid grid-cols-2 md:grid-cols-3 gap-2">${contentHTML}</div>` || `<p class="text-center text-gray-400">目前沒有任何記錄。</p>`;
        },
        closeCodexModal() {
            document.getElementById('codex-modal').classList.add('hidden');
        },
        triggerHitEffect(elementId) {
            const el = document.getElementById(elementId);
            if (el) { 
                el.classList.remove('hit-effect');
                void el.offsetWidth; // Trigger reflow
                el.classList.add('hit-effect');
            }
        }
    },

    saveLoad: {
        async save() {
            if (!game.state.player || !game.state.isFirebaseReady) { game.ui.showModal({ title: '存檔失敗', body: '<p>無法連接到雲端或沒有遊戲進度。</p>', buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }]});
                return; }
            game.ui.showModal({ title: '正在儲存至雲端...', body: '', buttons: []});
            try {
                const saveState = JSON.parse(JSON.stringify(game.state));
                delete saveState.dialogueCallback; // Functions can't be saved in JSON
                delete saveState.currentScreen; // Don't save transient state
                const saveRef = doc(db, 'artifacts', appId, 'users', userId, 'savegames', 'slot1');
                await setDoc(saveRef, saveState);
                game.ui.showModal({ title: '<span class="text-green-400">雲端存檔成功！</span>', body: '<p>你的進度已安全保存。</p>', buttons: [{ text: '好的', fn: () => game.ui.closeModal() }]});
            } catch (e) { console.error("Save failed:", e); game.ui.showModal({ title: '<span class="text-red-500">存檔失敗</span>', body: '<p>無法寫入雲端資料庫。</p>', buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }]});
            }
        },
        showLoadConfirmationModal() {
            game.ui.showModal({
                title: '確定讀取？', body: '<p class="text-gray-400">確定要讀取雲端存檔嗎？目前的遊戲進度將會被覆蓋。</p>', 
                buttons: [{ text: '取消', fn: () => game.ui.closeModal() }, { text: '確定', fn: () => {game.ui.closeModal(); game.saveLoad.load();}, class: 'bg-red-600 hover:bg-red-700 text-white' }]
            });
        },
        async load() {
            if (!game.state.isFirebaseReady) { game.ui.showModal({ title: '讀取失敗', body: '<p>無法連接到雲端。</p>', buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }]});
                return; }
            game.ui.showModal({ title: '正在從雲端讀取...', body: '', buttons: []});
            try {
                const saveRef = doc(db, 'artifacts', appId, 'users', userId, 'savegames', 'slot1');
                const docSnap = await getDoc(saveRef);
                if (docSnap.exists()) { 
                    const loadedState = docSnap.data();
                    // Restore non-JSON-able or transient state properties
                    loadedState.isRunning = false;
                    loadedState.actionInProgress = false;
                    loadedState.currentScreen = 'hub-screen';
                    if (!loadedState.codex) { // Backwards compatibility for old saves
                        loadedState.codex = {monsters: [], items: [], weapons: [], armors: []};
                    }
                     if (!loadedState.activeEffects) {
                        loadedState.activeEffects = [];
                    }
                    game.state = loadedState;
                    game.ui.closeModal();
                    game.ui.showScreen('hub-screen');
                } 
                else { game.ui.showModal({ title: '找不到雲端存檔', body: '<p>你似乎還沒有儲存過遊戲。</p>', buttons: [{ text: '返回', fn: () => game.ui.closeModal() }]});
                }
            } catch(e) { console.error("Load failed:", e);
                game.ui.showModal({ title: '<span class="text-red-500">讀取失敗</span>', body: '<p>無法讀取雲端資料。</p>', buttons: [{ text: '關閉', fn: () => game.ui.closeModal() }]});
            }
        }
    },
    
    // [新增] 音效管理系統
    audio: {
        sounds: {},
        currentBGM: null,
        init() {
            this.sounds = {
                // 背景音樂 - 請將 '...' 替換為你的音檔路徑
                hub: new Audio('.../hub_music.mp3'),
                combat: new Audio('.../combat_music.mp3'),
                
                // 音效 - 請將 '...' 替換為你的音檔路徑
                click: new Audio('.../click.mp3'),
                attack_hit: new Audio('.../attack.mp3'),
                level_up: new Audio('.../levelup.mp3'),
                win: new Audio('.../win.mp3'),
                lose: new Audio('.../lose.mp3'),
            };
            
            // 設定 BGM
            if (this.sounds.hub) { this.sounds.hub.loop = true; this.sounds.hub.volume = 0.3; }
            if (this.sounds.combat) { this.sounds.combat.loop = true; this.sounds.combat.volume = 0.3; }
            
            // 設定 SFX
            if (this.sounds.click) this.sounds.click.volume = 0.5;
            if (this.sounds.attack_hit) this.sounds.attack_hit.volume = 0.7;
            if (this.sounds.level_up) this.sounds.level_up.volume = 0.8;
            if (this.sounds.win) this.sounds.win.volume = 0.7;
            if (this.sounds.lose) this.sounds.lose.volume = 0.7;
        },
        playBGM(track) {
            // 如果當前有 BGM 且不是要播放的曲目，則停止
            if (this.currentBGM && this.currentBGM !== this.sounds[track]) {
                this.currentBGM.pause();
                this.currentBGM.currentTime = 0;
            }
            // 播放新的 BGM
            if (this.sounds[track] && this.sounds[track].paused) {
                this.sounds[track].play().catch(e => console.log("Audio play failed. User interaction might be required."));
                this.currentBGM = this.sounds[track];
            }
        },
        stopBGM() {
            if (this.currentBGM) {
                this.currentBGM.pause();
                this.currentBGM.currentTime = 0;
                this.currentBGM = null;
            }
        },
        playSFX(sfx) {
            if (this.sounds[sfx]) {
                this.sounds[sfx].currentTime = 0;
                this.sounds[sfx].play().catch(e => console.log("SFX play failed."));
            }
        }
    }
};

window.addEventListener('DOMContentLoaded', () => { game.init(); });