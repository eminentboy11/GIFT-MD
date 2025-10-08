import { getSetting, updateSetting } from '../lib/database.js';

export default {
    name: 'antidelete',
    aliases: ['antidel', 'ad'],
    category: 'UTILITY',
    description: 'Configure anti-delete message feature',
    usage: '.antidelete <pm|gc|all|off>\n\npm = Private messages only\ngc = Group chats only\nall = Both PM and GC\noff = Disable',
    execute: async (sock, message, args, context) => {
        const { reply, react, senderIsSudo } = context;

        if (!senderIsSudo) {
            await react('🚫');
            return await reply('🚫 Only the owner can configure anti-delete settings.');
        }

        const mode = args[1]?.toLowerCase();

        if (!mode || !['pm', 'gc', 'all', 'off'].includes(mode)) {
            const currentMode = getSetting('antidelete_mode', 'off');
            return await reply(`🛡️ *Anti-Delete Configuration*

*Current Mode:* ${currentMode.toUpperCase()}

*Available Modes:*
• \`.antidelete pm\` - Private messages only
• \`.antidelete gc\` - Group chats only  
• \`.antidelete all\` - Both PM and GC
• \`.antidelete off\` - Disable

_Note: Owner's deleted messages are always skipped._`);
        }

        updateSetting('antidelete_mode', mode);
        await react('✅');

        const modeText = {
            'pm': 'Private Messages Only',
            'gc': 'Group Chats Only',
            'all': 'All Chats (PM + GC)',
            'off': 'Disabled'
        };

        await reply(`✅ *Anti-Delete Mode Updated*

📌 Mode: *${modeText[mode]}*

${mode !== 'off' ? '_Deleted messages will now be recovered (except owner messages)._' : '_Anti-delete is now disabled._'}`);
    }
};
