const { EmbedBuilder } = require('discord.js');

// Kanal ve Rol ID'leri
const KAYIT_CHANNEL_ID = '1346245652916736071';
const KAYIT_LOG_CHANNEL_ID = '1346245764954984539';
const WHITELIST_ROLE_ID = '1334683152656105504';
const NONWHITELIST_ROLE_ID = '1334683153578721301';

class KayitSystem {
    constructor(client) {
        this.client = client;
    }

    // Kayıt işlemini gerçekleştir
    async kayitYap(interaction) {
        try {
            // Kanal kontrolü
            if (interaction.channelId !== KAYIT_CHANNEL_ID) {
                return await interaction.editReply({
                    content: '❌ Bu komut sadece kayıt kanalında kullanılabilir!',
                    flags: 64
                });
            }

            // Admin yetkisi kontrolü
            const { hasPermission } = require('../../utils/permissions');
            if (!hasPermission(interaction.member)) {
                return await interaction.editReply({
                    content: '❌ Bu komutu kullanmak için admin yetkisine sahip olmalısınız!',
                    flags: 64
                });
            }

            // Kullanıcı ID'sini al
            const userId = interaction.options.getString('kullanici_id');
            
            // Kullanıcıyı bul
            const member = await interaction.guild.members.fetch(userId).catch(() => null);
            if (!member) {
                return await interaction.editReply({
                    content: '❌ Belirtilen ID\'ye sahip kullanıcı bulunamadı!',
                    flags: 64
                });
            }

            // Rolleri güncelle
            try {
                await member.roles.remove(NONWHITELIST_ROLE_ID);
                await member.roles.add(WHITELIST_ROLE_ID);
            } catch (error) {
                console.error('Rol güncelleme hatası:', error);
                return await interaction.editReply({
                    content: '❌ Roller güncellenirken bir hata oluştu!',
                    flags: 64
                });
            }

            // Log kanalına bilgi gönder
            try {
                const logChannel = await this.client.channels.fetch(KAYIT_LOG_CHANNEL_ID);
                if (logChannel) {
                    const logEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('📝 Yeni Kayıt')
                        .addFields(
                            { name: '👤 Kullanıcı', value: `<@${member.id}>`, inline: true },
                            { name: '👨‍⚖️ Kayıt Eden', value: `<@${interaction.user.id}>`, inline: true },
                            { name: '⏰ Kayıt Zamanı', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
                        )
                        .setTimestamp();

                    await logChannel.send({ embeds: [logEmbed] });
                }
            } catch (error) {
                console.error('Log gönderme hatası:', error);
            }

            // Başarılı mesajı gönder
            return await interaction.editReply({
                content: `✅ <@${member.id}> başarıyla kayıt edildi!`,
                flags: 64
            });

        } catch (error) {
            console.error('Kayıt hatası:', error);
            try {
                await interaction.editReply({
                    content: '❌ Kayıt işlemi sırasında bir hata oluştu!',
                    flags: 64
                });
            } catch (err) {
                console.error('Hata mesajı gönderme hatası:', err);
            }
        }
    }

    // Komutun doğru kanalda kullanılıp kullanılmadığını kontrol et
    isValidChannel(channelId) {
        return channelId === KAYIT_CHANNEL_ID;
    }
}

module.exports = KayitSystem; 
