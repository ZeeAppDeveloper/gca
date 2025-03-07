const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags } = require('discord.js');

// Kanal ve Rol ID'leri
const STORY_BOT_CHANNEL_ID = '1345536534874558465';
const CHARACTER_STORY_CHANNEL_ID = '1343659559926894722';
const CHARACTER_APPROVED_ROLE_ID = '1343991513994104995';

// Hata kodları
const ERROR_CODES = {
    CHANNEL_NOT_FOUND: 'SF001',
    MESSAGE_DELETE_FAILED: 'SF002',
    FORM_CREATE_FAILED: 'SF003',
    MODAL_SHOW_FAILED: 'SF004',
    STORY_SUBMIT_FAILED: 'SF005',
    STORY_APPROVE_FAILED: 'SF006',
    STORY_REJECT_FAILED: 'SF007',
    DM_FAILED: 'SF008'
};

// Hata loglama fonksiyonu
function logError(code, error, context = {}) {
    console.error(`[${code}] Hekayə Sistemi Xətası: ${error.message}`, {
        timestamp: new Date().toISOString(),
        code,
        error: error.stack,
        ...context
    });
}

class StoryFormSystem {
    constructor(client) {
        this.client = client;
    }

    // Form mesajını oluştur
    async createFormMessage(channel) {
        try {
            console.log('createFormMessage fonksiyonu çağrıldı');
            
            const messages = await channel.messages.fetch({ limit: 10 }).catch(error => {
                logError(ERROR_CODES.MESSAGE_DELETE_FAILED, error, {
                    channelId: channel.id
                });
                return new Map();
            });

            const botMessages = messages.filter(msg => 
                msg.author.id === this.client.user.id && 
                msg.embeds.length > 0
            );
            
            if (botMessages.size > 0) {
                console.log(`${botMessages.size} adet eski form mesajı bulundu, siliniyor...`);
                try {
                    await channel.bulkDelete(botMessages).catch(error => {
                        logError(ERROR_CODES.MESSAGE_DELETE_FAILED, error, {
                            channelId: channel.id,
                            messageCount: botMessages.size
                        });
                    });
                } catch (error) {
                    for (const [_, message] of botMessages) {
                        await message.delete().catch(() => {});
                    }
                }
            }
            
            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('Whitelist Müraciet Forması')
                .setDescription('Bu form GCA uygulamasına göndəriləcək. Şifrələrini və ya digər həssas bilgilərini paylaşmadığından əmin ol.')
                .setThumbnail('https://media.discordapp.net/attachments/1334683202861793280/1334683202861793280/gca.gif');
            
            const button = new ButtonBuilder()
                .setCustomId('submit_story_form')
                .setLabel('Göndər')
                .setEmoji('📝')
                .setStyle(ButtonStyle.Primary);
            
            const row = new ActionRowBuilder().addComponents(button);
            
            const sentMessage = await channel.send({
                embeds: [embed],
                components: [row]
            }).catch(error => {
                logError(ERROR_CODES.FORM_CREATE_FAILED, error, {
                    channelId: channel.id
                });
                throw error;
            });
            
            console.log('Form mesajı başarıyla oluşturuldu:', sentMessage.id);
            return sentMessage;
        } catch (error) {
            logError(ERROR_CODES.FORM_CREATE_FAILED, error, {
                channelId: channel?.id
            });
            throw error;
        }
    }

    // Form modalını göster
    async showStoryForm(interaction) {
        try {
            // Etkileşim türünü kontrol et
            if (!interaction.isButton()) {
                throw new Error('Geçersiz etkileşim türü');
            }

            const modal = new ModalBuilder()
                .setCustomId('story_form_submit')
                .setTitle('Whitelist Müraciet Forması');

            const icNameInput = new TextInputBuilder()
                .setCustomId('ic_name')
                .setLabel('IC (KARAKTERİNİZİN) AD SOYADI')
                .setPlaceholder('Məsələn: John Doe')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(50);

            const birthInfoInput = new TextInputBuilder()
                .setCustomId('birth_info')
                .setLabel('DOĞUM TARİXİ, MİLLİYƏTİ VƏ DOĞULDUĞU YER')
                .setPlaceholder('Məsələn: 15.03.1990 | Azərbaycan | Bakı')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(100);

            const characterStoryInput = new TextInputBuilder()
                .setCustomId('character_story')
                .setLabel('KARAKTER HEKAYƏSİ (1200-2000 SİMVOL)')
                .setPlaceholder('Karakterinizin keçmişi, həyat təcrübəsi və şəxsiyyəti haqqında ətraflı məlumat')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(1200)
                .setMaxLength(2000);

            const connectionsInput = new TextInputBuilder()
                .setCustomId('connections')
                .setLabel('LEGAL VƏ İLLEGAL BAĞLANTILAR (500 SİMVOL)')
                .setPlaceholder('Karakterinizin legal və illegal əlaqələri haqqında məlumat')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true)
                .setMinLength(1)
                .setMaxLength(500);

            const rows = [
                new ActionRowBuilder().addComponents(icNameInput),
                new ActionRowBuilder().addComponents(birthInfoInput),
                new ActionRowBuilder().addComponents(characterStoryInput),
                new ActionRowBuilder().addComponents(connectionsInput)
            ];

            modal.addComponents(...rows);

            // Modal'ı göster
            await interaction.showModal(modal).catch(error => {
                logError(ERROR_CODES.MODAL_SHOW_FAILED, error, {
                    userId: interaction.user.id
                });
                throw error;
            });

        } catch (error) {
            logError(ERROR_CODES.MODAL_SHOW_FAILED, error, {
                userId: interaction.user.id
            });
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: `❌ [${ERROR_CODES.MODAL_SHOW_FAILED}] Bir xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin.`,
                        ephemeral: true
                    });
                }
            } catch (err) {
                logError(ERROR_CODES.MODAL_SHOW_FAILED, err, {
                    context: 'error_reply_failed',
                    userId: interaction.user.id
                });
            }
        }
    }

    // Modal submit işleyicisi
    async handleStorySubmit(interaction) {
        try {
            if (!interaction.isModalSubmit()) {
                throw new Error('Geçersiz etkileşim türü');
            }

            const icName = interaction.fields.getTextInputValue('ic_name');
            const birthInfo = interaction.fields.getTextInputValue('birth_info');
            const characterStory = interaction.fields.getTextInputValue('character_story');
            const connections = interaction.fields.getTextInputValue('connections');

            const storyChannel = await this.client.channels.fetch(CHARACTER_STORY_CHANNEL_ID).catch(error => {
                logError(ERROR_CODES.CHANNEL_NOT_FOUND, error, {
                    channelId: CHARACTER_STORY_CHANNEL_ID
                });
                throw error;
            });

            if (!storyChannel) {
                throw new Error('Hikaye kanalı bulunamadı');
            }

            const embed = new EmbedBuilder()
                .setColor('#5865F2')
                .setTitle('📝 Yeni Whitelist Müraciəti')
                .setDescription(`Müraciət edən: <@${interaction.user.id}>`)
                .addFields(
                    {
                        name: '👤 IC Ad Soyad',
                        value: icName
                    },
                    {
                        name: '📅 Doğum məlumatları',
                        value: birthInfo
                    },
                    {
                        name: '📖 Karakter hekayəsi (Hissə 1)',
                        value: characterStory.slice(0, 1024)
                    }
                );

            if (characterStory.length > 1024) {
                embed.addFields({
                    name: '📖 Karakter hekayəsi (Hissə 2)',
                    value: characterStory.slice(1024)
                });
            }

            embed.addFields({
                name: '🤝 Əlaqələr',
                value: connections
            })
            .setFooter({ text: `Müraciat ID: ${interaction.user.id} • ${new Date().toLocaleString('az-AZ')}` });

            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`approve_story_${interaction.user.id}`)
                        .setLabel('Təsdiq Et')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`reject_story_${interaction.user.id}`)
                        .setLabel('Rədd Et')
                        .setStyle(ButtonStyle.Danger)
                );

            await storyChannel.send({
                embeds: [embed],
                components: [buttons]
            }).catch(error => {
                logError(ERROR_CODES.STORY_SUBMIT_FAILED, error, {
                    userId: interaction.user.id
                });
                throw error;
            });

            await interaction.editReply({
                content: '✅ Formunuz uğurla göndərildi!',
                ephemeral: true
            });

        } catch (error) {
            logError(ERROR_CODES.STORY_SUBMIT_FAILED, error, {
                userId: interaction.user.id
            });

            const errorMessage = '❌ Bir xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin.';
            
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: errorMessage,
                        ephemeral: true
                    });
                } else {
                    await interaction.editReply({
                        content: errorMessage,
                        ephemeral: true
                    });
                }
            } catch (err) {
                logError(ERROR_CODES.STORY_SUBMIT_FAILED, err, {
                    context: 'error_reply_failed',
                    userId: interaction.user.id
                });
            }
        }
    }

    // Hikaye onaylama işleyicisi
    async handleStoryApprove(interaction) {
        try {
            const userId = interaction.customId.split('_')[2];
            const user = await this.client.users.fetch(userId);

            if (!user) {
                throw new Error('Kullanıcı bulunamadı');
            }

            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#00FF00')
                .setTitle('✅ Whitelist Müraciəti Təsdiqləndi');

            await interaction.message.edit({
                embeds: [embed],
                components: []
            });

            try {
                await user.send('✅ Whitelist müraciətiniz təsdiqləndi! Zəhmət olmasa !kayit əmrini istifadə edərək qeydiyyatdan keçin.');
            } catch (dmError) {
                logError(ERROR_CODES.DM_FAILED, dmError, {
                    userId: user.id
                });
            }

            await interaction.editReply({
                content: `✅ <@${userId}> istifadəçisinin whitelist müraciəti təsdiqləndi.`,
                ephemeral: true
            });

        } catch (error) {
            logError(ERROR_CODES.STORY_APPROVE_FAILED, error, {
                userId: interaction.user.id
            });

            const errorMessage = '❌ Bir xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin.';
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: errorMessage,
                    ephemeral: true
                });
            }
        }
    }

    // Hikaye reddetme modalını göster
    async showRejectModal(interaction) {
        try {
            if (!interaction.isButton()) {
                throw new Error('Geçersiz etkileşim türü');
            }

            const { hasPermission } = require('../../utils/permissions');
            if (!hasPermission(interaction.member)) {
                await interaction.reply({
                    content: '❌ Bu əməliyyat üçün admin səlahiyyətiniz yoxdur!',
                    ephemeral: true
                });
                return;
            }

            const userId = interaction.customId.split('_')[2];
            const modal = new ModalBuilder()
                .setCustomId(`reject_reason_${userId}`)
                .setTitle('Rədd Etmə Səbəbi');

            const reasonInput = new TextInputBuilder()
                .setCustomId('reject_reason')
                .setLabel('Rədd etmə səbəbini yazın')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Hekayənin rədd edilmə səbəbini buraya yazın...')
                .setRequired(true)
                .setMinLength(10)
                .setMaxLength(1000);

            const firstActionRow = new ActionRowBuilder().addComponents(reasonInput);
            modal.addComponents(firstActionRow);

            await interaction.showModal(modal);

        } catch (error) {
            logError(ERROR_CODES.STORY_REJECT_FAILED, error, {
                userId: interaction.user.id
            });

            const errorMessage = '❌ Bir xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin.';
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: errorMessage,
                    ephemeral: true
                });
            }
        }
    }

    // Hikaye reddetme işleyicisi
    async handleStoryReject(interaction) {
        try {
            const userId = interaction.customId.split('_')[2];
            const reason = interaction.fields.getTextInputValue('reject_reason');
            const user = await this.client.users.fetch(userId);

            if (!user) {
                throw new Error('Kullanıcı bulunamadı');
            }

            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#FF0000')
                .setTitle('❌ Whitelist Müraciəti Rədd Edildi')
                .addFields({
                    name: '📝 Rədd Edilmə Səbəbi',
                    value: reason
                });

            await interaction.message.edit({
                embeds: [embed],
                components: []
            });

            try {
                await user.send(`❌ Whitelist müraciətiniz rədd edildi.\n📝 Səbəb: ${reason}`);
            } catch (dmError) {
                logError(ERROR_CODES.DM_FAILED, dmError, {
                    userId: user.id
                });
            }

            await interaction.editReply({
                content: `❌ <@${userId}> istifadəçisinin whitelist müraciəti rədd edildi.`,
                ephemeral: true
            });

        } catch (error) {
            logError(ERROR_CODES.STORY_REJECT_FAILED, error, {
                userId: interaction.user.id
            });

            const errorMessage = '❌ Bir xəta baş verdi. Zəhmət olmasa daha sonra yenidən cəhd edin.';
            
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: errorMessage,
                    ephemeral: true
                });
            } else {
                await interaction.editReply({
                    content: errorMessage,
                    ephemeral: true
                });
            }
        }
    }
}

module.exports = StoryFormSystem; 
