const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

// Kanal ve kategori ID'leri
const TICKET_CHANNEL_ID = '1334683212630331452';
const TICKET_CATEGORY_ID = '1334683168854507610';
const TICKET_LOG_CHANNEL_ID = '1345432023291924661';

// İzin verilen roller
const ALLOWED_ROLES = [
    '699922665301082133',
    '1334683125040545882',
    '1334683126269612032',
    '1334683129713131622',
    '1334683127125246022',
    '1334683128442388480',
    '1334683130661044244',
    '1341587554201374780',
    '1334683131587858462',
    '1334683132401680509',
    '1334683135211868262',
    '1334683139074818199',
    '1334683140236771400'
];

class TicketSystem {
    constructor(client, adminXPSystem) {
        this.client = client;
        this.adminXPSystem = adminXPSystem;
    }

    // Ticket mesajını yenileme
    async refreshTicketMessage() {
        try {
            const ticketChannel = await this.client.channels.fetch(TICKET_CHANNEL_ID);
            if (!ticketChannel) {
                console.error('Ticket kanalı bulunamadı!');
                return;
            }

            // Önceki mesajları sil
            try {
                const messages = await ticketChannel.messages.fetch({ limit: 100 });
                if (messages.size > 0) {
                    for (const [_, message] of messages) {
                        try {
                            await message.delete();
                        } catch (err) {
                            console.error('Mesaj silme hatası:', err);
                        }
                    }
                }
            } catch (error) {
                console.error('Mesajları silerken hata:', error);
            }

            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('Ticket Sistemi')
                .setDescription('Aşağıdakı düymələrdən birinə basaraq ticket yarada bilərsiniz.')
                .addFields(
                    { name: '🎮 Oyun İçi Dəstək', value: 'Oyun içi problemlər üçün ticket yaradın.', inline: true },
                    { name: '🌐 Oyun Xarici Dəstək', value: 'Digər problemlər üçün ticket yaradın.', inline: true },
                    { name: '⚠️ Xəta Bildirişi', value: 'Tapılan xətaları bildirmək üçün ticket yaradın.', inline: true }
                );

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_oyunici')
                        .setLabel('Oyun İçi Dəstək')
                        .setEmoji('🎮')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('ticket_oyundisi')
                        .setLabel('Oyun Xarici Dəstək')
                        .setEmoji('🌐')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('ticket_hata')
                        .setLabel('Xəta Bildirişi')
                        .setEmoji('⚠️')
                        .setStyle(ButtonStyle.Danger)
                );

            await ticketChannel.send({ embeds: [embed], components: [row] });
            console.log('Ticket mesajı başarıyla yenilendi!');
        } catch (error) {
            console.error('Ticket mesajı yenileme hatası:', error);
        }
    }

    // Ticket oluşturma
    async createTicket(interaction, ticketType) {
        let ticketName = '';
        let ticketColor = '';

        switch (ticketType) {
            case 'oyunici':
                ticketName = '🎮-oyun-içi-dəstək';
                ticketColor = '#5865F2';
                break;
            case 'oyundisi':
                ticketName = '🌐-oyun-xarici-dəstək';
                ticketColor = '#57F287';
                break;
            case 'hata':
                ticketName = '⚠️-xəta-bildirişi';
                ticketColor = '#ED4245';
                break;
            default:
                await interaction.editReply({
                    content: '❌ Yanlış ticket növü!',
                    ephemeral: true
                });
                return;
        }

        try {
            const guild = interaction.guild;
            const existingTicket = guild.channels.cache.find(
                channel => channel.name.includes(interaction.user.username.toLowerCase())
            );

            if (existingTicket) {
                await interaction.editReply({
                    content: `❌ Artıq açıq bir ticket kanalınız var: ${existingTicket}`,
                    ephemeral: true
                });
                return;
            }

            const channel = await guild.channels.create({
                name: `${ticketName}-${interaction.user.username.toLowerCase()}`,
                type: ChannelType.GuildText,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    },
                    ...ALLOWED_ROLES.map(roleId => ({
                        id: roleId,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels]
                    }))
                ]
            });

            const embed = new EmbedBuilder()
                .setColor(ticketColor)
                .setTitle(`${interaction.user.tag} - Ticket`)
                .setDescription('Zəhmət olmasa probleminizi təsvir edin.')
                .setTimestamp();

            const closeButton = new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Tələbi Bağla')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(closeButton);

            await channel.send({ embeds: [embed], components: [row] });
            
            await interaction.editReply({
                content: `✅ Ticket kanalınız yaradıldı: ${channel}`,
                ephemeral: true
            });

        } catch (error) {
            console.error('Ticket oluşturma hatası:', error);
            await interaction.editReply({
                content: '❌ Ticket yaradılarkən xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin.',
                ephemeral: true
            });
        }
    }

    // Ticket kapatma
    async closeTicket(interaction) {
        try {
            const hasPermission = interaction.member.roles.cache.some(role => ALLOWED_ROLES.includes(role.id));
            
            if (!hasPermission) {
                return await interaction.reply({
                    content: '❌ Bu əməliyyat üçün admin səlahiyyətiniz yoxdur!',
                    ephemeral: true
                });
            }

            const modal = new ModalBuilder()
                .setCustomId('ticket_close_reason')
                .setTitle('Ticket Bağlama Səbəbi');

            const reasonInput = new TextInputBuilder()
                .setCustomId('close_reason')
                .setLabel('Xətanın/Problemin özəti')
                .setPlaceholder('Problemi və həllini qısaca izah edin')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000);

            const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);
        } catch (error) {
            console.error('Modal gösterme hatası:', error);
            await interaction.reply({
                content: '❌ Modal göstərilərkən xəta baş verdi!',
                ephemeral: true
            });
        }
    }

    // Ticket kapatma sebebi alındığında
    async handleTicketClose(interaction) {
        try {
            const reason = interaction.fields.getTextInputValue('close_reason');
            const ticketChannel = interaction.channel;
            
            if (this.adminXPSystem) {
                await this.adminXPSystem.addTicketCloseXP(interaction.user.id);
            }

            const logChannel = await interaction.guild.channels.fetch(TICKET_LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('Ticket Bağlandı')
                    .addFields(
                        { name: '📝 Ticket Adı', value: ticketChannel.name, inline: true },
                        { name: '🔒 Bağlayan Admin', value: interaction.user.tag, inline: true },
                        { name: 'Bağlama Səbəbi', value: reason }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

            await interaction.editReply({
                content: '✅ Ticket 5 saniyə sonra bağlanacaq.',
                ephemeral: true
            });

            setTimeout(async () => {
                try {
                    await ticketChannel.delete();
                } catch (error) {
                    console.error('Kanal silme hatası:', error);
                    if (!ticketChannel.deleted) {
                        await interaction.followUp({
                            content: '❌ Ticket bağlanarkən xəta baş verdi!',
                            ephemeral: true
                        }).catch(() => {});
                    }
                }
            }, 5000);

        } catch (error) {
            console.error('Ticket kapatma hatası:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Ticket bağlanarkən xəta baş verdi!',
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: '❌ Ticket bağlanarkən xəta baş verdi!',
                    ephemeral: true
                });
            }
        }
    }
}

module.exports = TicketSystem; 
