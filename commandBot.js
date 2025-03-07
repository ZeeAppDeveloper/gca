const { Client, GatewayIntentBits, Partials, ChannelType, ApplicationCommandOptionType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { config } = require('dotenv');
const { EmbedBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

// Sistemleri içe aktar
const TicketSystem = require('./src/systems/ticket/ticketSystem');
const StorySystem = require('./src/systems/story/storySystem');
const AdminCallSystem = require('./src/systems/admin/adminCallSystem');
const AdminXPSystem = require('./src/systems/xp/adminXPSystem');
const StatusSystem = require('./src/systems/status/statusSystem');
const KayitSystem = require('./src/systems/kayit/kayitSystem');
const StoryFormSystem = require('./src/systems/story/storyFormSystem');

// Yardımcı fonksiyonları içe aktar
const { hasPermission } = require('./src/utils/permissions');

// Çevre değişkenlerini yükle
config();

// Bot istemcisini oluştur
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ]
});

// Sistemleri başlat
const adminXPSystem = new AdminXPSystem(client);
const ticketSystem = new TicketSystem(client, adminXPSystem);
const storySystem = new StorySystem(client, adminXPSystem);
const adminCallSystem = new AdminCallSystem(client, adminXPSystem);
const statusSystem = new StatusSystem(client);
const kayitSystem = new KayitSystem(client);
const storyFormSystem = new StoryFormSystem(client);

// Hata kodları
const ERROR_CODES = {
    INTERACTION_FAILED: 'E001',
    COMMAND_FAILED: 'E002',
    BUTTON_FAILED: 'E003',
    MODAL_FAILED: 'E004',
    PERMISSION_DENIED: 'E005',
    CHANNEL_INVALID: 'E006',
    USER_NOT_FOUND: 'E007',
    SYSTEM_ERROR: 'E999'
};

// Hata loglama fonksiyonu
function logError(code, error, context = {}) {
    console.error(`[${code}] Xəta: ${error.message}`, {
        timestamp: new Date().toISOString(),
        code,
        error: error.stack,
        ...context
    });
}

// Global hata yakalama
process.on('uncaughtException', (error) => {
    logError(ERROR_CODES.SYSTEM_ERROR, error, {
        type: 'uncaughtException',
        timestamp: new Date().toISOString()
    });
});

process.on('unhandledRejection', (error) => {
    logError(ERROR_CODES.SYSTEM_ERROR, error, {
        type: 'unhandledRejection',
        timestamp: new Date().toISOString()
    });
});

// Bot yeniden bağlanma mekanizması
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_INTERVAL = 5000;

client.on('disconnect', () => {
    console.log('Bot bağlantısı kesildi, yeniden bağlanmaya çalışılıyor...');
    tryReconnect();
});

client.on('error', (error) => {
    logError(ERROR_CODES.SYSTEM_ERROR, error, {
        type: 'clientError',
        timestamp: new Date().toISOString()
    });
});

function tryReconnect() {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        setTimeout(() => {
            console.log(`Yenidən qoşulma cəhdi: ${reconnectAttempts}`);
            client.login(process.env.TOKEN).catch((error) => {
                logError(ERROR_CODES.SYSTEM_ERROR, error, {
                    type: 'reconnectError',
                    attempt: reconnectAttempts
                });
                tryReconnect();
            });
        }, RECONNECT_INTERVAL);
    } else {
        console.error('Maksimum yenidən qoşulma cəhdi həddini aşdı!');
        reconnectAttempts = 0;
        process.exit(1);
    }
}

// Otomatik yeniden başlatma mekanizması
let restartTimeout;
function scheduleRestart() {
    // Her 6 saatte bir yeniden başlat
    restartTimeout = setTimeout(() => {
        console.log('Planlı yenidən başlatma başladılır...');
        try {
            client.destroy();
            process.exit(0);
        } catch (error) {
            logError(ERROR_CODES.SYSTEM_ERROR, error, {
                type: 'scheduledRestartError'
            });
            process.exit(1);
        }
    }, 6 * 60 * 60 * 1000);
}

// Bot hazır olduğunda
client.once('ready', async () => {
    try {
        console.log(`${client.user.tag} olaraq giriş edildi!`);
        scheduleRestart();
        
        // Bot durumunu ayarla
        let activities = [
            { 
                name: 'GCA RP oynamaq istəyir😔',
                type: 0
            },
            {
                name: 'Mülakat gözləyir',
                type: 3
            },
            {
                name: 'Sizə Baxıram',
                type: 0
            }
        ];
        
        let i = 0;
        setInterval(() => {
            try {
                client.user.setPresence({
                    activities: [activities[i]],
                    status: 'online'
                });
                i = ++i % activities.length;
            } catch (error) {
                logError(ERROR_CODES.SYSTEM_ERROR, error, {
                    type: 'presenceUpdateError'
                });
            }
        }, 10000);
        
        try {
            const guild = client.guilds.cache.first();
            if (guild) {
                // Sesli kanala katıl
                try {
                    const voiceChannel = await client.channels.fetch('1334683185573003304');
                    if (voiceChannel) {
                        try {
                            const connection = joinVoiceChannel({
                                channelId: voiceChannel.id,
                                guildId: voiceChannel.guild.id,
                                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
                            });

                            connection.on('error', error => {
                                logError(ERROR_CODES.SYSTEM_ERROR, error, {
                                    type: 'voiceConnectionError',
                                    channelId: voiceChannel.id
            });
        });

                            console.log('Bot səsli kanala qoşuldu:', voiceChannel.name);
                        } catch (voiceError) {
                            logError(ERROR_CODES.SYSTEM_ERROR, voiceError, {
                                type: 'voiceConnectionError',
                                channelId: voiceChannel.id
                            });
                        }
                    }
                } catch (error) {
                    logError(ERROR_CODES.SYSTEM_ERROR, error, {
                        type: 'voiceChannelFetchError'
                    });
                }

        const commands = [
                    {
                        name: 'hikaye',
                        description: 'Karakter hikayesi gönder',
                        options: [
                            {
                                name: 'hikaye',
                                description: 'Karakter hikayenizi yazın',
                                type: ApplicationCommandOptionType.String,
                        required: true
                    }
                ]
            },
            {
                name: 'xp',
                        description: 'Admin istatistiklerini gösterir',
                options: [
                    {
                                name: 'kullanıcı',
                                description: 'İstatistiklerini görmek istediğiniz kullanıcı (boş bırakırsanız kendinizin)',
                                type: ApplicationCommandOptionType.User,
                        required: false
                    }
                ]
            },
            {
                        name: 'admincagir',
                        description: 'Admin çağırma mesajını oluşturur (sadece yöneticiler için)'
                    },
                    {
                        name: 'statuson',
                        description: 'Serveri aktif olarak işaretler (sadece adminler için)'
                    },
                    {
                        name: 'statusoff',
                        description: 'Serveri deaktif olarak işaretler (sadece adminler için)'
                    },
                    {
                        name: 'restart',
                        description: 'Server restart bildirimi gönderir (sadece adminler için)'
                    },
                    {
                        name: 'kayit',
                        description: 'Kullanıcıyı whitelist olarak kayıt eder (sadece adminler için)',
                options: [
                            {
                                name: 'kullanici_id',
                                description: 'Kayıt edilecek kullanıcının Discord ID\'si',
                                type: ApplicationCommandOptionType.String,
                                required: true
                            }
                        ]
                    },
                    {
                        name: 'xpall',
                        description: 'Tüm adminlerin XP ve ticket istatistiklerini gösterir'
                    }
                ];

                // Komutları kaydet
                try {
                    await guild.commands.set(commands).catch(error => {
                        logError(ERROR_CODES.SYSTEM_ERROR, error, {
                            type: 'commandRegistrationError'
                        });
                    });
                    console.log('Komutlar uğurla qeydə alındı!');
    } catch (error) {
                    logError(ERROR_CODES.SYSTEM_ERROR, error, {
                        type: 'commandSetError'
                    });
                }

                // Sistemleri başlat
                try {
                    await ticketSystem.refreshTicketMessage().catch(() => {});
                    console.log('Ticket sistemi yeniləndi');
                } catch (error) {
                    logError(ERROR_CODES.SYSTEM_ERROR, error, {
                        type: 'ticketSystemError'
                    });
                }

                try {
                    const adminCallChannel = await client.channels.fetch('1334683206238212167');
                    if (adminCallChannel) {
                        await adminCallSystem.createCallMessage(adminCallChannel).catch(() => {});
                        console.log('Admin çağırış mesajı yaradıldı!');
                    }
                } catch (error) {
                    logError(ERROR_CODES.SYSTEM_ERROR, error, {
                        type: 'adminCallSystemError'
                    });
                }

                try {
                    const storyBotChannel = await client.channels.fetch('1345536534874558465');
                    if (storyBotChannel) {
                        await storyFormSystem.createFormMessage(storyBotChannel).catch(() => {});
                        console.log('Hekayə form mesajı yaradıldı!');
                    }
                } catch (error) {
                    logError(ERROR_CODES.SYSTEM_ERROR, error, {
                        type: 'storyFormSystemError'
                    });
                }
            }
        } catch (error) {
            logError(ERROR_CODES.SYSTEM_ERROR, error, {
                type: 'startupError'
            });
        }
    } catch (error) {
        logError(ERROR_CODES.SYSTEM_ERROR, error, {
            type: 'readyEventError'
        });
    }
});

// Komut etkileşimleri
client.on('interactionCreate', async interaction => {
    try {
        // Slash komutları için ilk yanıt
        if (interaction.isChatInputCommand()) {
            try {
                // Etkileşimi ertele
                if (!interaction.replied && !interaction.deferred) {
                    const isStatusCommand = ['statuson', 'statusoff', 'restart'].includes(interaction.commandName);
                    const isXPCommand = interaction.commandName === 'xpall';
                    const shouldBePublic = isStatusCommand || isXPCommand;
                    
                    await interaction.deferReply({ 
                        ephemeral: !shouldBePublic
                    }).catch(err => {
                        logError(ERROR_CODES.INTERACTION_FAILED, err, { 
                            type: 'deferReply',
                            command: interaction.commandName 
                        });
                    });
                }

                // Admin komutları için yetki kontrolü
                if (['statuson', 'statusoff', 'restart', 'kayit'].includes(interaction.commandName)) {
                    if (!hasPermission(interaction.member)) {
                        return await interaction.editReply({
                            content: `❌ Bu komutu kullanmak üçün admin səlahiyyətiniz yoxdur!`,
                            ephemeral: true
                        });
                    }
                }

                // Komut işlemleri
                switch (interaction.commandName) {
                    case 'hikaye':
                        await storySystem.submitStory(interaction);
                        break;
                    case 'xp':
                        const targetUser = interaction.options.getUser('kullanıcı') || interaction.user;
                        const embed = await adminXPSystem.getAdminStatsEmbed(targetUser.id);
                        await interaction.editReply({ embeds: [embed] }).catch(() => {});
                        break;
                    case 'admincagir':
                        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                            return await interaction.editReply({
                                content: '❌ Bu komutu kullanmak için yönetici yetkisine sahip olmalısınız!',
                                ephemeral: true
                            });
                        }
                        
                        try {
                            const adminCallChannel = await client.channels.fetch('1334683206238212167');
                            if (adminCallChannel) {
                                await adminCallSystem.createCallMessage(adminCallChannel);
                                await interaction.editReply({
                                    content: '✅ Admin çağırma mesajı oluşturuldu!',
                    ephemeral: true
                });
            }
                        } catch (error) {
                            console.error('Admin çağırma mesajı oluşturma hatası:', error);
                            await interaction.editReply({
                                content: '❌ Admin çağırma mesajı oluşturulurken bir hata oluştu!',
                        ephemeral: true
                    });
                }
                        break;
                    case 'statuson':
                        await statusSystem.setStatusOn(interaction);
                        break;
                    case 'statusoff':
                        await statusSystem.setStatusOff(interaction);
                        break;
                    case 'restart':
                        await statusSystem.setRestart(interaction);
                        break;
                    case 'kayit':
                        await kayitSystem.kayitYap(interaction);
                        break;
                    case 'xpall':
                        const allAdminsEmbed = await adminXPSystem.getAllAdminStatsEmbed();
                        await interaction.editReply({ embeds: [allAdminsEmbed] }).catch(() => {});
                        break;
                }
            } catch (cmdError) {
                logError(ERROR_CODES.COMMAND_FAILED, cmdError, {
                    command: interaction.commandName,
                    userId: interaction.user.id
                });

                const errorMessage = `❌ Komut icra edilərkən xəta baş verdi!`;
                
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
        // Buton etkileşimleri
        else if (interaction.isButton()) {
            try {
                const customId = interaction.customId;
                
                if (customId.startsWith('ticket_')) {
                    const action = customId.split('_')[1];
                    if (action === 'oyunici' || action === 'oyundisi' || action === 'hata') {
                        await interaction.deferReply({ ephemeral: true });
                        await ticketSystem.createTicket(interaction, action);
                    } else if (action === 'close') {
                        await ticketSystem.closeTicket(interaction);
                    }
                }
                else if (customId === 'direct_admin_call') {
                    await interaction.deferReply({ ephemeral: true });
                    await adminCallSystem.directAdminCall(interaction);
                }
                else if (customId === 'submit_story_form') {
                    await storyFormSystem.showStoryForm(interaction);
                }
                else if (customId.startsWith('approve_story_')) {
                    await interaction.deferReply({ ephemeral: true });
                    await storyFormSystem.handleStoryApprove(interaction);
                }
                else if (customId.startsWith('reject_story_')) {
                    await storyFormSystem.showRejectModal(interaction);
                }
            } catch (btnError) {
                logError(ERROR_CODES.BUTTON_FAILED, btnError, {
                    buttonId: interaction.customId,
                    userId: interaction.user.id
                });

                const errorMessage = `❌ Əməliyyat zamanı xəta baş verdi!`;
                
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
        // Modal gönderimi
        else if (interaction.isModalSubmit()) {
            try {
                await interaction.deferReply({ ephemeral: true });
                
                if (interaction.customId === 'ticket_close_reason') {
                    await ticketSystem.handleTicketClose(interaction);
                }
                else if (interaction.customId === 'story_form_submit') {
                    await storyFormSystem.handleStorySubmit(interaction);
                }
                else if (interaction.customId.startsWith('reject_reason_')) {
                    await storyFormSystem.handleStoryReject(interaction);
                }
            } catch (modalError) {
                logError(ERROR_CODES.MODAL_FAILED, modalError, {
                    modalId: interaction.customId,
                    userId: interaction.user.id
                });

                const errorMessage = `❌ Form emal edilərkən xəta baş verdi!`;
                
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
    } catch (error) {
        logError(ERROR_CODES.SYSTEM_ERROR, error, {
            interactionType: interaction.type,
            userId: interaction.user.id
        });

        const errorMessage = `❌ Sistem xətası baş verdi!`;
        
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
});

// Mesaj olayları
client.on('messageCreate', async message => {
    // Bot mesajlarını yoksay
    if (message.author.bot) return;

    // Admin XP sistemi için mesaj XP'si ekle
    const member = message.member;
    if (member && hasPermission(member)) {
        await adminXPSystem.addMessageXP(member.id, message.channel.id);
    }

    // !kayit komutunu belirli kanalda engelle
    if (message.content.toLowerCase() === '!kayit' && message.channel.id === '1334683202861793280') {
        try {
            await message.delete();
            const warningMessage = await message.channel.send({
                content: `❌ ${message.author}, bu kanalda !kayit komutunu kullanamazsınız!`
            });
            setTimeout(() => warningMessage.delete().catch(() => {}), 5000);
        } catch (error) {
            console.error('Mesaj silme hatası:', error);
        }
        return;
    }
});

// Ses kanalı olayları
client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        // Admin XP sistemi için ses kanalı olaylarını işle
        await adminXPSystem.handleVoiceStateUpdate(oldState, newState);
    } catch (error) {
        console.error('Ses kanalı olayı hatası:', error);
    }
});

// Botu başlat
client.login(process.env.TOKEN);
