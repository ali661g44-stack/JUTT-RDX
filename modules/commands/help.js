/**
 * Help Command
 * Displays available commands and their usage
 */

module.exports = {
  config: {
    name: 'help',
    aliases: ['h', 'menu', 'Help', 'HELP'],
    description: 'Shows available commands with pagination',
    usage: '{prefix}help [page/all/command]',
    credit: "𝐏𝐫𝐢𝐲𝐚𝐧𝐬𝐡 𝐑𝐚𝐣𝐩𝐮𝐭",
    hasPrefix: true,
    permission: 'PUBLIC',
    cooldown: 2,
    category: 'GENERAL'
  },

  /**
   * Command execution
   * @param {Object} options - Options object
   * @param {Object} options.api - Facebook API instance
   * @param {Object} options.message - Message object
   * @param {Array<string>} options.args - Command arguments
   */
  run: async function ({ api, message, args }) {
    const { threadID, messageID, senderID } = message;
    const prefix = global.config.prefix;

    // If a specific command is requested
    if (args.length > 0 && isNaN(args[0]) && args[0].toLowerCase() !== 'all') {
      const commandName = args[0].toLowerCase();
      const command = global.client.commands.get(commandName) ||
        [...global.client.commands.values()].find(cmd =>
          cmd.config.aliases && cmd.config.aliases.includes(commandName)
        );

      if (!command) {
        return global.api.sendMessage(`❌ Command "${commandName}" not found.`, threadID, messageID);
      }

      // Check if user has permission to view this command
      const hasPermission = await global.permissions.checkPermission(senderID, command.config.permission);
      if (!hasPermission) {
        return global.api.sendMessage(`❌ You don't have permission to view this command.`, threadID, messageID);
      }

      // Format command info with improved structure
      let reply = `╭─────────────────╮
│    📋 COMMAND INFO 📋  │
╰─────────────────╯

📌 𝗡𝗔𝗠𝗘: ${command.config.name}
📝 𝗗𝗘𝗦𝗖𝗥𝗜𝗣𝗧𝗜𝗢𝗡: ${command.config.description || 'No description provided'}
🔄 𝗨𝗦𝗔𝗚𝗘: ${command.config.usage?.replace('{prefix}', prefix) || `${prefix}${command.config.name}`}
⏱️ 𝗖𝗢𝗢𝗟𝗗𝗢𝗪𝗡: ${command.config.cooldown || 5} seconds
🔑 𝗣𝗥𝗘𝗙𝗜𝗫 𝗥𝗘𝗤𝗨𝗜𝗥𝗘𝗗: ${command.config.hasPrefix === true ? 'Yes' : 'No'}`;

      if (command.config.aliases && command.config.aliases.length > 0) {
        reply += `\n🔄 𝗔𝗟𝗜𝗔𝗦𝗘𝗦: ${command.config.aliases.map(a => prefix + a).join(', ')}`;
      }

      reply += `\n🔒 𝗣𝗘𝗥𝗠𝗜𝗦𝗦𝗜𝗢𝗡: ${command.config.permission || 'PUBLIC'}
📂 𝗖𝗔𝗧𝗘𝗚𝗢𝗥𝗬: ${command.config.category || 'UNCATEGORIZED'}
👨‍💻 𝗖𝗥𝗘𝗗𝗜𝗧: ${command.config.credit || 'Unknown'}`;

      return global.api.sendMessage(reply, threadID, messageID);
    }

    // Determine page number or if showing all commands
    const COMMANDS_PER_PAGE = 20;
    let showAll = false;
    let pageNumber = 1;

    if (args.length > 0) {
      if (args[0].toLowerCase() === 'all') {
        showAll = true;
      } else if (!isNaN(args[0])) {
        pageNumber = parseInt(args[0]);
        if (pageNumber < 1) pageNumber = 1;
      }
    }

    // Get all commands user has permission to use
    const commands = [...new Set(global.client.commands.values())];
    const permittedCommands = [];

    for (const cmd of commands) {
      const hasPermission = await global.permissions.checkPermission(senderID, cmd.config.permission || 'PUBLIC');
      if (hasPermission) {
        permittedCommands.push(cmd);
      }
    }

    // Sort commands alphabetically
    permittedCommands.sort((a, b) => a.config.name.localeCompare(b.config.name));

    if (showAll) {
      // Show all commands
      let reply = `╭─────────────────╮
│    👑 𝐎𝐖𝐍𝐄𝐑 𝐀𝐘𝐀𝐍 👑   │
╰─────────────────╯

📊 𝗧𝗢𝗧𝗔𝗟 𝗖𝗢𝗠𝗠𝗔𝗡𝗗𝗦: ${permittedCommands.length}
📝 𝗨𝗦𝗘: ${prefix}help [command] for details
📄 𝗣𝗔𝗚𝗜𝗡𝗔𝗧𝗘𝗗: ${prefix}help [page number]

`;

      // Group commands by category for all view
      const groupedCommands = {};
      for (const cmd of permittedCommands) {
        const category = cmd.config.category || 'UNCATEGORIZED';
        if (!groupedCommands[category]) {
          groupedCommands[category] = [];
        }
        // Only commands with hasPrefix: false show without prefix, all others show with prefix
        const commandDisplay = cmd.config.hasPrefix === false ? cmd.config.name : `${prefix}${cmd.config.name}`;
        groupedCommands[category].push(commandDisplay);
      }

      // Define category order and emojis
      const categoryOrder = [
        'GENERAL', 'ECONOMY', 'ADMIN', 'MODERATION',
        'UTILITY', 'FUN', 'INVENTORY', 'NSFW', 'SYSTEM', 'UNCATEGORIZED'
      ];

      const categoryEmojis = {
        'GENERAL': '🔧',
        'ECONOMY': '💰',
        'ADMIN': '👑',
        'MODERATION': '🛡️',
        'UTILITY': '🔨',
        'FUN': '🎮',
        'INVENTORY': '🎒',
        'NSFW': '🔞',
        'SYSTEM': '⚙️',
        'UNCATEGORIZED': '📁'
      };

      // Sort categories and add commands
      const sortedCategories = Object.keys(groupedCommands).sort((a, b) => {
        return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
      });

      for (const category of sortedCategories) {
        const emoji = categoryEmojis[category] || '📁';
        reply += `┌─ ${emoji} ${category} ───────┐\n`;

        // Sort commands alphabetically within each category
        const sortedCommands = groupedCommands[category].sort();

        // Format commands in a grid-like structure (2 columns)
        const commandsPerRow = 2;
        for (let i = 0; i < sortedCommands.length; i += commandsPerRow) {
          const rowCommands = sortedCommands.slice(i, i + commandsPerRow);
          reply += `│ ${rowCommands.join(' • ')}\n`;
        }

        reply += '└─────────────────────┘\n\n';
      }

      return global.api.sendMessage(reply, threadID, messageID);
    } else {
      // Show paginated commands
      const totalPages = Math.ceil(permittedCommands.length / COMMANDS_PER_PAGE);
      const startIndex = (pageNumber - 1) * COMMANDS_PER_PAGE;
      const endIndex = startIndex + COMMANDS_PER_PAGE;
      const commandsToShow = permittedCommands.slice(startIndex, endIndex);

      if (commandsToShow.length === 0) {
        return global.api.sendMessage(`❌ Page ${pageNumber} not found. Total pages: ${totalPages}`, threadID, messageID);
      }

      let reply = `╭─────────────────────╮
│   📋 PAGE ${pageNumber}/${totalPages} - COMMANDS 📋  │
╰─────────────────────╯

📊 𝗧𝗢𝗧𝗔𝗟: ${permittedCommands.length} commands
📄 𝗖𝗨𝗥𝗥𝗘𝗡𝗧: Page ${pageNumber}/${totalPages}
📝 𝗗𝗘𝗧𝗔𝗜𝗟𝗦: ${prefix}help [command]
🔢 𝗣𝗔𝗚𝗘𝗦: ${prefix}help [page number]
📚 𝗔𝗟𝗟: ${prefix}help all

`;

      // Group commands by category for this page
      const groupedCommands = {};
      for (const cmd of commandsToShow) {
        const category = cmd.config.category || 'UNCATEGORIZED';
        if (!groupedCommands[category]) {
          groupedCommands[category] = [];
        }
        // Only commands with hasPrefix: false show without prefix, all others show with prefix
        const commandDisplay = cmd.config.hasPrefix === false ? cmd.config.name : `${prefix}${cmd.config.name}`;
        groupedCommands[category].push(commandDisplay);
      }

      // Define category order and emojis
      const categoryOrder = [
        'GENERAL', 'ECONOMY', 'ADMIN', 'MODERATION',
        'UTILITY', 'FUN', 'INVENTORY', 'NSFW', 'SYSTEM', 'UNCATEGORIZED'
      ];

      const categoryEmojis = {
        'GENERAL': '🔧',
        'ECONOMY': '💰',
        'ADMIN': '👑',
        'MODERATION': '🛡️',
        'UTILITY': '🔨',
        'FUN': '🎮',
        'INVENTORY': '🎒',
        'NSFW': '🔞',
        'SYSTEM': '⚙️',
        'UNCATEGORIZED': '📁'
      };

      // Sort categories and add commands
      const sortedCategories = Object.keys(groupedCommands).sort((a, b) => {
        return categoryOrder.indexOf(a) - categoryOrder.indexOf(b);
      });

      for (const category of sortedCategories) {
        const emoji = categoryEmojis[category] || '📁';
        reply += `┌─ ${emoji} ${category} ───────┐\n`;

        // Sort commands alphabetically within each category
        const sortedCommands = groupedCommands[category].sort();

        // Format commands in a grid-like structure (2 columns)
        const commandsPerRow = 2;
        for (let i = 0; i < sortedCommands.length; i += commandsPerRow) {
          const rowCommands = sortedCommands.slice(i, i + commandsPerRow);
          reply += `│ ${rowCommands.join(' • ')}\n`;
        }

        reply += '└─────────────────────┘\n\n';
      }

      // Add navigation hint
      if (totalPages > 1) {
        const prevPage = pageNumber - 1 > 0 ? pageNumber - 1 : totalPages;
        const nextPage = pageNumber + 1 <= totalPages ? pageNumber + 1 : 1;
        reply += `┌─ 𝗡𝗔𝗩𝗜𝗚𝗔𝗧𝗜𝗢𝗡 ─────────┐
│ ◀️ Previous: ${prefix}help ${prevPage}
│ ▶️ Next: ${prefix}help ${nextPage}
│ 📚 All: ${prefix}help all
└─────────────────────┘`;
      }

      return global.api.sendMessage(reply, threadID, messageID);
    }
  },

  /**
   * Handle reply (not used for this command)
   */
  handleReply: async function ({ api, message, args, replyData }) {
    // This command doesn't use reply functionality
  }
};
