require("dotenv").config();
const { REST, Routes, SlashCommandBuilder } = require("discord.js");

const commands = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Comprueba si el bot responde"),

  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Reproduce música en un canal de voz")
    .addStringOption(option =>
      option
        .setName("query")
        .setDescription("Link o nombre de la canción")
        .setRequired(true)
    )
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log("Registrando comandos...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.TEST_GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados en tu server de pruebas");
  } catch (error) {
    console.error(error);
  }
})();
