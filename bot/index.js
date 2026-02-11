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

      await interaction.deferReply();

      // 1) Resolver SIEMPRE a una URL válida
      let videoUrl = null;

      // Si es URL de youtube válida (video)
      if (play.yt_validate(query) === "video") {
        videoUrl = query;
      } else {
        // Buscar en YouTube (si query es texto o link raro)
        const results = await play.search(query, { limit: 1, source: { youtube: "video" } });
        if (!results || results.length === 0 || !results[0]?.url) {
          return interaction.editReply("❌ No encontré resultados (prueba con otro nombre o link).");
        }
        videoUrl = results[0].url;
      }

      // Doble check para evitar undefined
      if (!videoUrl || typeof videoUrl !== "string" || !videoUrl.startsWith("http")) {
        return interaction.editReply("❌ No pude obtener una URL válida para reproducir.");
      }

      // 2) Conectarse al canal
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guild.id,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        selfDeaf: true,
      });

      const player = getOrCreatePlayer(voiceChannel.guild.id);
      connection.subscribe(player);

      // 3) Stream y reproducir
      try {
        console.log("▶️ URL final a reproducir:", videoUrl);

        const stream = await play.stream(videoUrl, { quality: 2 });
        if (!stream?.stream) {
          return interaction.editReply("❌ No pude abrir el stream de audio.");
        }

        const resource = createAudioResource(stream.stream, { inputType: stream.type });
        player.play(resource);

        player.once(AudioPlayerStatus.Playing, () => {
          console.log("✅ AudioPlayerStatus.Playing");
        });

        const info = await play.video_basic_info(videoUrl);
        const title = info?.video_details?.title ?? "Canción";

        return interaction.editReply(`▶️ Reproduciendo: **${title}**`);
      } catch (e) {
        console.error("❌ Error reproduciendo:", e);
        return interaction.editReply("❌ Error reproduciendo audio.");
      }
    }
  } catch (err) {
    console.error("❌ Error en interactionCreate:", err);
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply("❌ Ocurrió un error inesperado.");
      } else {
        await interaction.reply({ content: "❌ Ocurrió un error inesperado.", ephemeral: true });
      }
    } catch {}
  }
});

client.login(process.env.DISCORD_TOKEN);

