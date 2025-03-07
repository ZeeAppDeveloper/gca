const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } = require('discord.js');

// Kanal ve Rol ID'leri
const ADMIN_CALL_CHANNEL_ID = '1334683206238212167';
const ADMIN_ROLE_ID = '1334683135920832626';

// Hata kodları
const ERROR_CODES = {
    CHANNEL_NOT_FOUND: 'AC001',
    MESSAGE_DELETE_FAILED: 'AC002',
    CREATE_MESSAGE_FAILED: 'AC003',
    DIRECT_CALL_FAILED: 'AC004',
    NOTIFY_FAILED: 'AC005'
};

// Hata loglama fonksiyonu
function logError(code, error, context = {}) {
    console.error(`[${code}] Admin Çağrı Sistemi Xətası: ${error.message}`, {
        timestamp: new Date().toISOString(),
        code,
        error: error.stack,
        ...context
    });
}

class AdminCallSystem {
    constructor(client, adminXPSystem) {
        this.client = client;
        this.adminXPSystem = adminXPSystem;
    }

    // Admin çağrı mesajını oluşturma
    async createCallMessage(channel) {
        try {
            console.log('createCallMessage fonksiyonu çağrıldı');
            
            // Önce mevcut mesajları temizle
            const messages = await channel.messages.fetch({ limit: 10 });
            const botMessages = messages.filter(msg => 
                msg.author.id === this.client.user.id && 
                msg.embeds.length > 0
            );
            
            if (botMessages.size > 0) {
                console.log(`${botMessages.size} adet eski admin çağırma mesajı bulundu, siliniyor...`);
                for (const [_, message] of botMessages) {
                    try {
                        await message.delete();
                    } catch (err) {
                        logError(ERROR_CODES.MESSAGE_DELETE_FAILED, err, {
                            messageId: message.id,
                            channelId: channel.id
                        });
                    }
                }
            }
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Admin Çağırma Sistemi')
                .setDescription('Aşağıdakı düyməyə basaraq admin çağıra bilərsiniz.')
                .setThumbnail('https://media.discordapp.net/attachments/1334683202861793280/1334683202861793280/gca.gif');
            
            const button = new ButtonBuilder()
                .setCustomId('direct_admin_call')
                .setLabel('Admin Çağır')
                .setEmoji('📞')
                .setStyle(ButtonStyle.Primary);
            
            const row = new ActionRowBuilder().addComponents(button);
            
            const sentMessage = await channel.send({
                embeds: [embed],
                components: [row]
            });
            
            console.log('Admin çağırma mesajı başarıyla oluşturuldu:', sentMessage.id);
            return sentMessage;
        } catch (error) {
            logError(ERROR_CODES.CREATE_MESSAGE_FAILED, error, {
                channelId: channel.id
            });
            throw error;
        }
    }

    // Doğrudan admin çağırma
    async directAdminCall(interaction) {
        try {
            const adminCallChannel = await this.client.channels.fetch(ADMIN_CALL_CHANNEL_ID);
            
            if (!adminCallChannel) {
                logError(ERROR_CODES.CHANNEL_NOT_FOUND, new Error('Admin çağrı kanalı bulunamadı'), {
                    channelId: ADMIN_CALL_CHANNEL_ID
                });
                return await interaction.editReply({
                    content: `❌ [${ERROR_CODES.CHANNEL_NOT_FOUND}] Bir xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin.`,
                    ephemeral: true
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('Yeni Admin Çağırışı')
                .setDescription(`${interaction.user.username} admin çağırır!`)
                .setAuthor({
                    name: interaction.user.tag,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .addFields(
                    { name: '👤 Çağıran', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📍 Kanal', value: `<#${interaction.channel.id}>`, inline: true },
                    { name: '⏰ Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                )
                .setTimestamp();

            // Admin çağrı mesajını gönder
            await adminCallChannel.send({
                content: `<@&${ADMIN_ROLE_ID}> Dikkat! Bir kullanıcı mülakat için bekliyor!`,
                embeds: [embed]
            });

            // Başarılı mesajını gönder
            await interaction.editReply({
                content: '✅ Admin çağırışınız uğurla göndərildi! Zəhmət olmasa gözləyin.',
                flags: MessageFlags.Ephemeral
            });

            // XP ekle
            if (this.adminXPSystem) {
                await this.adminXPSystem.addAdminCallResponseXP(interaction.user.id);
            }

        } catch (error) {
            logError(ERROR_CODES.DIRECT_CALL_FAILED, error, {
                userId: interaction.user.id,
                channelId: interaction.channel.id
            });
            await interaction.editReply({
                content: `❌ [${ERROR_CODES.DIRECT_CALL_FAILED}] Admin çağırışı zamanı xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin.`,
                flags: MessageFlags.Ephemeral
            }).catch(() => {});
        }
    }

    // Adminleri etiketleme
    async notifyAdmins(interaction) {
        try {
            await interaction.deferUpdate();

            if (this.adminXPSystem) {
                await this.adminXPSystem.addAdminCallResponseXP(interaction.user.id);
            }
            
            await interaction.followUp({
                content: `✅ <@&${ADMIN_ROLE_ID}> Admin çağırışınız uğurla göndərildi!`,
                ephemeral: true
            });
        } catch (error) {
            logError(ERROR_CODES.NOTIFY_FAILED, error, {
                userId: interaction.user.id,
                channelId: interaction.channel.id
            });
            
            try {
                await interaction.followUp({
                    content: `❌ [${ERROR_CODES.NOTIFY_FAILED}] Admin çağırışı zamanı xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin.`,
                    ephemeral: true
                });
            } catch (err) {
                logError(ERROR_CODES.NOTIFY_FAILED, err, {
                    context: 'error_reply_failed',
                    userId: interaction.user.id
                });
            }
        }
    }
}

module.exports = AdminCallSystem; 
