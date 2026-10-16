/**
 * Database-backed Auth State for Baileys
 * Persists WhatsApp session data in PostgreSQL instead of filesystem
 * Works on ephemeral filesystems like Render, Heroku, etc.
 */

const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');
const { pool } = require('../config/db');

/**
 * Create database-backed auth state
 * @param {string} instanceName - WhatsApp instance name
 */
async function useDatabaseAuthState(instanceName) {
    let creds;
    let keys = {};

    // Load existing session from database
    const result = await pool.query(
        'SELECT session_data FROM wa_instances WHERE instance_name = $1',
        [instanceName]
    );

    if (result.rows.length > 0 && result.rows[0].session_data) {
        const sessionData = result.rows[0].session_data;
        creds = sessionData.creds || initAuthCreds();
        keys = sessionData.keys || {};
    } else {
        // Initialize new credentials
        creds = initAuthCreds();
        keys = {};
    }

    /**
     * Save credentials to database
     */
    const saveCreds = async () => {
        const sessionData = {
            creds,
            keys
        };

        await pool.query(
            `UPDATE wa_instances 
             SET session_data = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE instance_name = $2`,
            [JSON.stringify(sessionData, BufferJSON.replacer), instanceName]
        );
    };

    return {
        state: {
            creds,
            keys: {
                get: (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        let value = keys[`${type}-${id}`];
                        if (value) {
                            if (type === 'app-state-sync-key') {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        }
                    }
                    return data;
                },
                set: (data) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                keys[key] = value;
                            } else {
                                delete keys[key];
                            }
                        }
                    }
                    saveCreds();
                }
            }
        },
        saveCreds
    };
}

module.exports = { useDatabaseAuthState };
