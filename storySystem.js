const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

// Kanal ID'leri
const STORY_CHANNEL_ID = '1334683208729030666';
const STORY_LOG_CHANNEL_ID = '1334683210809241600';

class StorySystem {
    constructor(client, adminXPSystem) {
        this.client = client;
        this.adminXPSystem = adminXPSystem;
    }

    // Hikaye gönderme
    async submitStory(interaction) {
        try {
            const story = interaction.options.getString('hikaye');
            const storyChannel = await this.client.channels.fetch(STORY_CHANNEL_ID);
            
            if (!storyChannel) {
                return await interaction.reply({
                    content: '❌ Hikaye kanalı bulunamadı!',
                    flags: 64
                });
            }

            const embed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📖 Yeni Karakter Hikayesi')
                .setAuthor({
                    name: interaction.user.tag,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setDescription(story)
                .setTimestamp();

            const approveButton = new ButtonBuilder()
                .setCustomId(`approve_story_${interaction.user.id}`)
                .setLabel('Təsdiq Et')
                .setStyle(ButtonStyle.Success);

            const rejectButton = new ButtonBuilder()
                .setCustomId(`reject_story_${interaction.user.id}`)
                .setLabel('Rədd Et')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()
                .addComponents(approveButton, rejectButton);

            await storyChannel.send({
                embeds: [embed],
                components: [row]
            });

            await interaction.reply({
                content: '✅ Hekayəniz təsdiq üçün göndərildi!',
                flags: 64
            });

        } catch (error) {
            console.error('Hikaye gönderme hatası:', error);
            await interaction.reply({
                content: '❌ Hekayə göndərilərkən xəta baş verdi!',
                flags: 64
            });
        }
    }

    // Hikaye onaylama
    async approveStory(interaction) {
        try {
            const userId = interaction.customId.split('_')[2];
            const user = await this.client.users.fetch(userId);
            
            if (!user) {
                return await interaction.reply({
                    content: '❌ İstifadəçi tapılmadı!',
                    flags: 64
                });
            }

            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#00ff00')
                .addFields({
                    name: '✅ Təsdiq Edildi',
                    value: `Təsdiq edən: ${interaction.user.tag}`
                });

            await interaction.message.edit({
                embeds: [embed],
                components: []
            });

            // Log kanalına bilgi gönder
            const logChannel = await interaction.guild.channels.fetch(STORY_LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('✅ Hekayə Təsdiq Edildi')
                    .addFields(
                        { name: '👤 Yazan', value: user.tag, inline: true },
                        { name: '👨‍⚖️ Təsdiq Edən', value: interaction.user.tag, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

            // Kullanıcıya DM gönder
            try {
                await user.send('✅ Hekayəniz təsdiq edildi! Artıq oyuna başlaya bilərsiniz.');
            } catch (error) {
                console.error('DM gönderme hatası:', error);
            }

            // Admin XP'sini güncelle
            if (this.adminXPSystem) {
                await this.adminXPSystem.addStoryApprovalXP(interaction.user.id);
            }

            await interaction.reply({
                content: '✅ Hekayə təsdiq edildi!',
                flags: 64
            });

        } catch (error) {
            console.error('Hikaye onaylama hatası:', error);
            await interaction.reply({
                content: '❌ Hekayə təsdiq edilərkən xəta baş verdi!',
                flags: 64
            });
        }
    }

    // Hikaye reddetme
    async rejectStory(interaction) {
        try {
            const userId = interaction.customId.split('_')[2];
            const user = await this.client.users.fetch(userId);
            
            if (!user) {
                return await interaction.reply({
                    content: '❌ İstifadəçi tapılmadı!',
                    flags: 64
                });
            }

            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setColor('#ff0000')
                .addFields({
                    name: '❌ Rədd Edildi',
                    value: `Rədd edən: ${interaction.user.tag}`
                });

            await interaction.message.edit({
                embeds: [embed],
                components: []
            });

            // Log kanalına bilgi gönder
            const logChannel = await interaction.guild.channels.fetch(STORY_LOG_CHANNEL_ID);
            if (logChannel) {
                const logEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Hekayə Rədd Edildi')
                    .addFields(
                        { name: '👤 Yazan', value: user.tag, inline: true },
                        { name: '👨‍⚖️ Rədd Edən', value: interaction.user.tag, inline: true }
                    )
                    .setTimestamp();

                await logChannel.send({ embeds: [logEmbed] });
            }

            // Kullanıcıya DM gönder
            try {
                await user.send('❌ Hekayəniz rədd edildi. Zəhmət olmasa, yeni bir hekayə yazın.');
            } catch (error) {
                console.error('DM gönderme hatası:', error);
            }

            // Admin XP'sini güncelle
            if (this.adminXPSystem) {
                await this.adminXPSystem.addStoryRejectionXP(interaction.user.id);
            }

            await interaction.reply({
                content: '✅ Hekayə rədd edildi!',
                flags: 64
            });

        } catch (error) {
            console.error('Hikaye reddetme hatası:', error);
            await interaction.reply({
                content: '❌ Hekayə rədd edilərkən xəta baş verdi!',
                flags: 64
            });
        }
    }
}

module.exports = StorySystem; 
