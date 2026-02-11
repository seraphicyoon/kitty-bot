require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  getVoiceConnection,
  AudioPlayerStatus,
} = require("@discordjs/voice");
const play = require("play-dl");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});

const players = new Map();

function getOrCreatePlayer(guildId) {
  if (players.has(guildId)) return players.get(guildId);

  const player = createAudioPlayer({
    behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
  });

  players.set(guildId, player);
  return player;
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    if (interaction.commandName === "ping") {
      return interaction.reply("🏓 Pong!");
    }

    if (interaction.commandName === "stop") {
      // Responde rápido para evitar timeout
      await interaction.reply("🛑 Deteniendo...");

      const conn = getVoiceConnection(interaction.guildId);
      if (conn) conn.destroy();

      players.delete(interaction.guildId);
      return interaction.editReply("🛑 Detenido y desconectado.");
    }

    if (interaction.commandName === "play") {
      const query = interaction.options.getString("query", true);
      const voiceChannel = interaction.member?.voice?.channel;

      if (!voiceChannel) {
        return interaction.reply({
          content: "❌ Debes estar en un canal de voz para usar /play.",
          ephemeral: true,
        });
      }

      // ✅ Esto evita "La aplicación no respondió"
      await interaction.deferReply();

      // Resolver URL / búsqueda (YouTube)
      let videoUrl;
      try {
        if (play.yt_validate(query) === "video") {
          videoUrl = query;
        } else {
          const results = await play.search(query, { limit: 1 });
          if (!results.length) {
            return interaction.editReply("❌ No encontré resultados.");
          }
          videoUrl = results[0].url;
        }
      } catch (e) {
        console.error(e);
        return interaction.editReply("❌ Error buscando en YouTube.");
      }

      // Conectarse al canal
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
      });

      const player = getOrCreatePlayer(voiceChannel.guild.id);
      connection.subscribe(player);

      // Stream y reproducir
      try {
        const stream = await play.stream(videoUrl, { quality: 2 });
        const resource = createAudioResource(stream.stream, {
          inputType: stream.type,
        });

        player.play(resource);

        // Log útil para debugging
        player.once(AudioPlayerStatus.Playing, () => {
          console.log(`▶️ Reproduciendo en ${voiceChannel.guild.id}: ${videoUrl}`);
        });

        const info = await play.video_basic_info(videoUrl);
        const title = info.video_details?.title ?? "Canción";

        return interaction.editReply(`▶️ Reproduciendo: **${title}**`);
      } catch (e) {
        console.error(e);
        return interaction.editReply("❌ Error reproduciendo audio.");
      }
    }
  } catch (err) {
    console.error("Error en interactionCreate:", err);

    // Intentar responder de forma segura
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ Ocurrió un error inesperado.");
      } else {
        await interaction.reply({
          content: "❌ Ocurrió un error inesperado.",
          ephemeral: true,
        });
      }
    } catch {}
  }
});

client.login(process.env.DISCORD_TOKEN);

