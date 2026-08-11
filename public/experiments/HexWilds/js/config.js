// 配置和常量
export const LANG = {
    en: { 
        title: "SURVIVAL", hp: "HP", food: "FOOD", ap: "AP", turn: "TURN", 
        move: "Move", attack: "Attack", rest: "Rest", end: "End", 
        settings: "SETTINGS", language: "Language", difficulty: "Difficulty", 
        color: "Color", apply: "Apply & Restart", close: "Close", 
        died: "YOU DIED", restart: "TRY AGAIN", 
        msg_move: "Move (1 AP)", msg_attack: "Attack (2 AP)", 
        msg_rest: "Rest: +HP / -Food", msg_ap: "Not enough AP!", 
        msg_stealth: "Hidden in grass", msg_light: "Healing in light", 
        msg_burn: "Enemy burns in sunlight!", msg_day: "Day breaks...", 
        msg_night: "Night falls...", reason_starve: "Starved to death", 
        reason_killed: "Killed by mutant", msg_forest: "Night forest is dangerous!",
        select_scheme: "Select Color Scheme", start_game: "Start Game",
        character_settings: "Character Settings", move_speed: "Move Speed",
        color_scheme: "Color Scheme", change_scheme: "Change Scheme",
        initial_time: "Initial Time", initial_time_day: "Day", initial_time_night: "Night"
    },
    zh: { 
        title: "异星生存", hp: "生命", food: "饱腹", ap: "行动力", turn: "回合", 
        move: "移动", attack: "攻击", rest: "休息", end: "结束", 
        settings: "游戏设置", language: "语言", difficulty: "难度", 
        color: "角色颜色", apply: "应用并重启", close: "关闭", 
        died: "任务失败", restart: "重新开始", 
        msg_move: "移动 (1 AP)", msg_attack: "攻击 (2 AP)", 
        msg_rest: "休息：恢复生命 / 消耗饱腹", msg_ap: "行动力不足！", 
        msg_stealth: "隐匿于草丛中", msg_light: "沐浴圣光，生命恢复", 
        msg_burn: "敌人在阳光下燃烧！", msg_day: "黎明到来...", 
        msg_night: "夜幕降临...", reason_starve: "死于饥饿与寒冷", 
        reason_killed: "被变异体撕碎", msg_forest: "夜间树林充满危险！",
        select_scheme: "选择配色方案", start_game: "开始游戏",
        character_settings: "角色设置", move_speed: "移动速度",
        color_scheme: "配色方案", change_scheme: "更改配色",
        initial_time: "初始时间", initial_time_day: "白天", initial_time_night: "黑夜"
    }
};

// 配色方案配置
export const COLOR_SCHEMES = {
    classic: {
        name: { en: 'Classic', zh: '经典' },
        colors: {
            bg_night: 0x1a2332, // 稍微亮一点的夜晚背景
            bg_day: 0xa8d8ea, // 更清新的天空蓝
            pathValid: 0x66bb6a,
            pathInvalid: 0xe53935,
            highlight: 0xffffff,
            enemy: 0xab47bc,
            grass: 0x6b9f4a, // 更明亮的草绿色
            lightPlant: 0x00e5ff
        },
        materials: {
            plain: 0x5a7a8a, // 更明亮的灰蓝色
            water: 0x4a90e2, // 更清新的蓝色
            seabed: 0x8b7355, // 河床颜色（沙色/深泥土色）
            forest: 0x4caf50, // 更明亮的绿色
            grassland: 0x66bb6a, // 更清新的草绿色
            mountain: 0x78909c // 更明亮的灰蓝色
        }
    },
    desert: {
        name: { en: 'Desert', zh: '沙漠' },
        colors: {
            bg_night: 0x1a0f0a,
            bg_day: 0xf4a460,
            pathValid: 0xd4af37,
            pathInvalid: 0xcd5c5c,
            highlight: 0xffd700,
            enemy: 0x8b4513,
            grass: 0x9acd32,
            lightPlant: 0xffa500
        },
        materials: {
            plain: 0xd2b48c,
            water: 0x4682b4,
            seabed: 0x9b7d5a, // 河床颜色（沙漠风格的沙色）
            forest: 0x6b8e23,
            grassland: 0x9acd32,
            mountain: 0x8b7355
        }
    },
    arctic: {
        name: { en: 'Arctic', zh: '极地' },
        colors: {
            bg_night: 0x0a0f1a,
            bg_day: 0xb0e0e6,
            pathValid: 0x87ceeb,
            pathInvalid: 0xff6b6b,
            highlight: 0xe0f7fa,
            enemy: 0x4a90e2,
            grass: 0x90caf9,
            lightPlant: 0x00bcd4
        },
        materials: {
            plain: 0xe3f2fd,
            water: 0x2196f3,
            seabed: 0x6b7a8a, // 河床颜色（极地风格的深色）
            forest: 0x64b5f6,
            grassland: 0x90caf9,
            mountain: 0xcfd8dc
        }
    }
};

export const CONFIG = {
    hexSize: 1.0, 
    mapRadius: 7,
    colors: COLOR_SCHEMES.classic.colors, // 默认使用经典配色
    light: { 
        day: { ambient: 0.9, dir: 1.0, plantInt: 0 },
        night: { ambient: 0.2, dir: 0.1, plantInt: 1.5, plantDist: 5, plantColor: '#00e5ff' }
    }
};

