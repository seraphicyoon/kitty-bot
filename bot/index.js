require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // /ping
  if (interaction.commandName === "ping") {
    return interaction.reply("🏓 Pong!");
  }

  // /play (por ahora solo prueba)
  if (interaction.commandName === "play") {
    const query = interaction.options.getString("query");

    if (!interaction.member.voice.channel) {
      return interaction.reply({
        content: "❌ Debes estar en un canal de voz.",
        ephemeral: true
      });
    }

    await interaction.reply(
      `🎶 Comando /play recibido\n🔍 Búsqueda: **${query}**`
    );

    console.log("PLAY solicitado:", query);
  }
});

client.login(process.env.DISCORD_TOKEN);
