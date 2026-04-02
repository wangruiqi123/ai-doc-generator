// db.js - 稳定版 SQLite 持久化实现
// 使用 sql.js 在浏览器中运行 SQLite，并通过 IndexedDB 实现数据持久化存储
// 确保刷新页面后聊天记录（包括 Markdown 格式）能够完整保留

// 全局变量：存储数据库初始化的 Promise
// 用于确保所有数据库操作都在数据库完全初始化后执行
let sqliteDbReady = null;

/**
 * 初始化 SQLite 数据库
 * 加载 sql.js 库，从 IndexedDB 恢复已有数据或创建新数据库
 * 创建 messages 表用于存储聊天记录
 * @returns {Promise} 返回初始化完成的 SQLite 数据库实例
 */
async function initSQLite() {
    // 加载 sql.js 库，指定 WASM 文件的 CDN 地址
    const SQL = await initSqlJs({
        locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
    });
    
    // 从 IndexedDB 加载之前保存的数据库二进制数据
    const saved = await loadFromIndexedDB();
    
    // 如果有保存的数据，则恢复数据库；否则创建新的空数据库
    const db = saved ? new SQL.Database(saved) : new SQL.Database();
    
    // 创建消息表（如果不存在）
    // 表结构包含：自增ID、角色(user/assistant)、内容、时间戳
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    return db;
}

/**
 * 确保 IndexedDB 中存在 'databases' 对象仓库
 * 这是解决 "object store not found" 错误的关键函数
 * 每次数据库操作前都调用此函数，确保操作环境完备
 * @returns {Promise} 确保对象仓库存在后 resolve
 */
async function ensureObjectStore() {
    return new Promise((resolve, reject) => {
        // 使用版本号 4 打开数据库
        // 如果当前版本低于 4，会触发 onupgradeneeded 事件
        const request = indexedDB.open('SQLiteDB', 4);
        
        /**
         * 数据库升级事件处理
         * 当版本号增加或首次创建数据库时触发
         * 确保 'databases' 对象仓库存在
         */
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            // 检查对象仓库是否存在，不存在则创建
            if (!db.objectStoreNames.contains('databases')) {
                db.createObjectStore('databases');
                console.log('已创建对象仓库 databases');
            }
        };
        
        /**
         * 数据库打开成功事件处理
         * 关闭数据库连接并 resolve Promise
         */
        request.onsuccess = (event) => {
            const db = event.target.result;
            db.close();
            resolve();
        };
        
        /**
         * 数据库打开失败事件处理
         * reject Promise 并传递错误信息
         */
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * 从 IndexedDB 加载 SQLite 数据库的二进制数据
 * 用于恢复之前的聊天记录
 * @returns {Promise<ArrayBuffer|null>} 返回数据库二进制数据或 null
 */
async function loadFromIndexedDB() {
    // 首先确保对象仓库存在（关键步骤！）
    await ensureObjectStore();
    
    return new Promise((resolve) => {
        // 以版本 4 打开数据库
        const request = indexedDB.open('SQLiteDB', 4);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            
            // 双重检查：确保对象仓库确实存在
            if (!db.objectStoreNames.contains('databases')) {
                db.close();
                resolve(null);
                return;
            }
            
            // 开始只读事务
            const tx = db.transaction('databases', 'readonly');
            const store = tx.objectStore('databases');
            
            // 获取主数据库数据（key 为 'main'）
            const getReq = store.get('main');
            
            getReq.onsuccess = () => {
                const data = getReq.result;
                db.close();
                resolve(data || null);
            };
            
            getReq.onerror = () => {
                db.close();
                resolve(null);
            };
            
            // 事务级别错误处理
            tx.onerror = () => {
                db.close();
                resolve(null);
            };
        };
        
        request.onerror = () => resolve(null);
    });
}

/**
 * 将 SQLite 数据库的二进制数据保存到 IndexedDB
 * 实现聊天记录的持久化存储
 * @param {Uint8Array} uint8array - SQLite 数据库导出的二进制数据
 * @returns {Promise} 保存成功后 resolve，失败则 reject
 */
async function saveToIndexedDB(uint8array) {
    // 首先确保对象仓库存在（关键步骤！）
    await ensureObjectStore();
    
    return new Promise((resolve, reject) => {
        // 以版本 4 打开数据库
        const request = indexedDB.open('SQLiteDB', 4);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            // 开始读写事务
            const tx = db.transaction('databases', 'readwrite');
            const store = tx.objectStore('databases');
            
            // 将数据库二进制数据保存到 key 为 'main' 的位置
            const putReq = store.put(uint8array, 'main');
            
            putReq.onsuccess = () => {
                db.close();
                resolve();
            };
            
            putReq.onerror = (e) => {
                db.close();
                reject(e.target.error);
            };
            
            // 事务级别错误处理
            tx.onerror = (e) => {
                db.close();
                reject(e.target.error);
            };
        };
        
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * 对外公开方法：添加新消息到数据库
 * 支持用户消息和助手消息的持久化存储
 * @param {string} role - 消息角色 ('user' 或 'assistant')
 * @param {string} content - 消息内容（支持 Markdown 格式）
 */
async function addMessage(role, content) {
    // 等待数据库初始化完成
    const db = await sqliteDbReady;
    // 执行 SQL 插入语句
    db.run("INSERT INTO messages (role, content) VALUES (?, ?)", [role, content]);
    // 导出数据库为二进制格式
    const exported = db.export();
    // 保存到 IndexedDB 实现持久化
    await saveToIndexedDB(exported);
}

/**
 * 对外公开方法：获取所有历史消息
 * 用于页面加载时恢复聊天记录
 * @returns {Promise<Array>} 返回按时间顺序排列的消息数组
 */
async function getAllMessages() {
    // 等待数据库初始化完成
    const db = await sqliteDbReady;
    // 准备 SQL 查询语句
    const stmt = db.prepare("SELECT * FROM messages ORDER BY id ASC");
    const results = [];
    // 遍历查询结果
    while (stmt.step()) results.push(stmt.getAsObject());
    // 释放预编译语句资源
    stmt.free();
    return results;
}

/**
 * 数据库初始化启动器
 * 页面加载时自动执行，初始化 SQLite 数据库
 * 将初始化 Promise 赋值给全局变量 sqliteDbReady
 */
(async () => {
    sqliteDbReady = initSQLite();
    await sqliteDbReady;
})();