const { EmbedBuilder, MessageFlags } = require('discord.js');

// Kanal ve Rol ID'leri
const STATUS_CHANNEL_ID = '1334683249892659281';
const PLAYER_ROLE_ID = '1334683152656105504';

class StatusSystem {
    constructor(client) {
        this.client = client;
    }

    // Server durumunu aktif olarak ayarla
    async setStatusOn(interaction) {
        try {
            if (!this.isValidChannel(interaction.channelId)) {
                return await interaction.editReply({
                    content: '❌ Bu komut yalnız status kanalında istifadə edilə bilər!',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('🌟 GCA Roleplay Status')
                .setDescription(`
                    ### 🟢 Server Aktiv və Oyuna Açıqdır!
                    
                    > **Qoşulmaq üçün:**
                    > \`🎮\` Oyun içində axtarışa **GCA** yazın
                    > \`⭐\` Serverə daxil olun və roleplay edin!
                    
                    ### 📢 Diqqət Whitelist!
                    Serverə daxil ola bilərsiniz!
                `)
                .setThumbnail('https://media.discordapp.net/attachments/1334683202861793280/1334683202861793280/gca.gif')
                .addFields(
                    { 
                        name: '📊 Server Məlumatları',
                        value: '```yaml\n🟢 Status: Aktiv\n🎮 Axtarış: GCA\n⏰ Son Yenilənmə: İndi\n👥 Whitelist: Aktiv```',
                        inline: false 
                    }
                )
                .setImage('https://media.discordapp.net/attachments/1334683202861793280/1334683202861793280/gca.gif')
                .setFooter({ 
                    text: '© GCA Roleplay | Azərbaycanın Ən Böyük Roleplay Serveri',
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            await interaction.editReply({ 
                content: `<@&${PLAYER_ROLE_ID}> Diqqət! Server aktivdır!`,
                embeds: [embed]
            });

        } catch (error) {
            console.error('Status aktifleştirme hatası:', error);
            await interaction.editReply({
                content: '❌ Status dəyişdirilərkən xəta baş verdi!',
                ephemeral: true
            });
        }
    }

    // Server durumunu deaktif olarak ayarla
    async setStatusOff(interaction) {
        try {
            if (!this.isValidChannel(interaction.channelId)) {
                return await interaction.editReply({
                    content: '❌ Bu komut yalnız status kanalında istifadə edilə bilər!',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🌟 GCA Roleplay Status')
                .setDescription(`
                    ### 🔴 Server Müvəqqəti Olaraq Bağlıdır
                    
                    > **Diqqət!**
                    > \`⚠️\` Server texniki səbəblərdən bağlıdır
                    > \`⏰\` Yenidən açılana qədər gözləyin
                    > \`📢\` Yeniliklərdən xəbərdar olmaq üçün bildirişləri açıq saxlayın
                `)
                .setThumbnail('https://media.discordapp.net/attachments/1334683202861793280/1334683202861793280/gca.gif')
                .addFields(
                    { 
                        name: '📊 Server Məlumatları',
                        value: '```diff\n- Status: Deaktiv\n- Səbəb: Texniki İşlər\n⏰ Son Yenilənmə: İndi```',
                        inline: false 
                    }
                )
                .setImage('https://media.discordapp.net/attachments/1334683202861793280/1334683202861793280/gca.gif')
                .setFooter({ 
                    text: '© GCA Roleplay | Azərbaycanın Ən Böyük Roleplay Serveri',
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Status deaktifleştirme hatası:', error);
            await interaction.editReply({
                content: '❌ Status dəyişdirilərkən xəta baş verdi!',
                ephemeral: true
            });
        }
    }

    // Server restart bildirimi
    async setRestart(interaction) {
        try {
            if (!this.isValidChannel(interaction.channelId)) {
                return await interaction.editReply({
                    content: '❌ Bu komut yalnız status kanalında istifadə edilə bilər!',
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('🌟 GCA Roleplay Status')
                .setDescription(`
                    ### 🔄 Server Yenidən Başladılır
                    
                    > **Məlumat**
                    > \`⚙️\` Texniki yenilənmə həyata keçirilir
                    > \`⏱️\` Təxmini müddət: 5-10 dəqiqə
                    > \`📢\` Yenidən aktiv olduqda bildiriş göndəriləcək
                `)
                .setThumbnail('https://media.discordapp.net/attachments/1334683202861793280/1334683202861793280/gca.gif')
                .addFields(
                    { 
                        name: '📊 Server Məlumatları',
                        value: '```fix\n🔄 Status: Yenidən Başladılır\n⏱️ Başlama: İndi\n📊 Prosess: Davam Edir```',
                        inline: false 
                    },
                    {
                        name: '⏰ Gözlənilən Müddət',
                        value: '```yaml\n🕐 Başlama: ' + new Date().toLocaleTimeString('az-AZ') + '\n🕑 Bitmə: ' + new Date(Date.now() + 10 * 60000).toLocaleTimeString('az-AZ') + '```',
                        inline: false
                    }
                )
                .setImage('https://media.discordapp.net/attachments/1334683202861793280/1334683202861793280/gca.gif')
                .setFooter({ 
                    text: '© GCA Roleplay | Azərbaycanın Ən Böyük Roleplay Serveri',
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Restart bildirimi hatası:', error);
            await interaction.editReply({
                content: '❌ Restart bildirişi göndərilərkən xəta baş verdi!',
                ephemeral: true
            });
        }
    }

    // Komutun doğru kanalda kullanılıp kullanılmadığını kontrol et
    isValidChannel(channelId) {
        return channelId === STATUS_CHANNEL_ID;
    }
}

module.exports = StatusSystem; 
