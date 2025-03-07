const { EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');



// XP değerleri
const XP_VALUES = {
    MESSAGE_XP: 1, // Normal mesaj XP'si
    VOICE_XP_PER_MINUTE: 0.5, // Dakikada 0.5 XP (30 XP/saat)
    TICKET_CLOSE: 20,
    INTERVIEW_CHANNEL_XP: 30, // Mülakat kanalları için XP
    SUPPORT_CHANNEL_XP: 30, // Destek kanalları için XP
    CHAT_CHANNEL_XP: 30, // Sohbet kanalları için XP
    ACTIVE_ADMIN_XP: 15 // Aktif yetkililer kanalı için XP
};

// Kanal grupları
const CHANNEL_GROUPS = {
    INTERVIEW_CHANNELS: [
        '1334683201507037276',
        '1334683204191256669',
        '1334683207379193858',
        '1334683210029994064',
        '1334683211133091930'
    ],
    SUPPORT_CHANNELS: [
        '1334683215788642346',
        '1334683217420091433',
        '1334683219693408290',
        '1334683221488697385'
    ],
    ACTIVE_ADMIN_CHANNELS: [
        '1334683185573003304',
        '1345081056847462442'
    ]
};

// XP Sistemi Ayarları
const XP_SETTINGS = {
    MESSAGE_COOLDOWN: 60000, // 1 dakika (mesaj XP'si için)
    VOICE_CHECK_INTERVAL: 60000 // Her 1 dakikada bir ses kontrolü
};

// Veri dosyası yolu
const DATA_FILE = path.join(__dirname, '../../../data/adminXP.json');

class AdminXPSystem {
    constructor(client) {
        this.client = client;
        this.adminData = new Map(); // Admin verilerini saklamak için
        this.voiceStates = new Map(); // Ses kanalı durumlarını takip etmek için
        
        // Veri klasörünü oluştur
        this.ensureDataDirectory();
        
        // Verileri yükle
        this.loadData();
        
        // Ses kanalı XP kontrolü için interval başlat
        this.startVoiceXPInterval();
        
        // Periyodik olarak verileri kaydet
        setInterval(() => this.saveData(), 60000); // Her 1 dakikada bir kaydet
    }
    
    // Veri klasörünün varlığını kontrol et ve yoksa oluştur
    ensureDataDirectory() {
        const dataDir = path.join(__dirname, '../../../data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }
    
    // Verileri dosyadan yükle
    loadData() {
        try {
            if (fs.existsSync(DATA_FILE)) {
                const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
                for (const [userId, userData] of Object.entries(data)) {
                    this.adminData.set(userId, userData);
                }
                console.log('Admin XP verileri başarıyla yüklendi.');
            }
        } catch (error) {
            console.error('Veri yükleme hatası:', error);
        }
    }
    
    // Verileri dosyaya kaydet
    saveData() {
        try {
            const data = {};
            for (const [userId, userData] of this.adminData.entries()) {
                data[userId] = userData;
            }
            fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
        } catch (error) {
            console.error('Veri kaydetme hatası:', error);
        }
    }

    // Ses kanalı XP kontrolü için interval
    startVoiceXPInterval() {
        setInterval(() => {
            try {
                const now = Date.now();
                this.client.guilds.cache.forEach(guild => {
                    guild.channels.cache.filter(channel => channel.type === 2).forEach(channel => {
                        channel.members.forEach((member) => {
                            if (member.user.bot) return;
                            if (!this.hasAdminPermission(member)) return;
                            if (member.voice.channel?.id === member.guild.afkChannelId) return;

                            const adminData = this.getAdminData(member.id);
                            const timeSinceLastVoiceXP = now - (adminData.lastVoiceXPTime || 0);
                            
                            if (timeSinceLastVoiceXP >= XP_SETTINGS.VOICE_CHECK_INTERVAL) {
                                let xpToAdd = XP_VALUES.VOICE_XP_PER_MINUTE;

                                // Kanal grubuna göre ek XP ekle
                                if (CHANNEL_GROUPS.INTERVIEW_CHANNELS.includes(channel.id)) {
                                    xpToAdd += XP_VALUES.INTERVIEW_CHANNEL_XP / 60; // Dakika başına ek XP
                                } else if (CHANNEL_GROUPS.SUPPORT_CHANNELS.includes(channel.id)) {
                                    xpToAdd += XP_VALUES.SUPPORT_CHANNEL_XP / 60;
                                } else if (CHANNEL_GROUPS.ACTIVE_ADMIN_CHANNELS.includes(channel.id)) {
                                    xpToAdd += XP_VALUES.ACTIVE_ADMIN_XP / 60;
                                }

                                adminData.xp += xpToAdd;
                                adminData.voiceTime += XP_SETTINGS.VOICE_CHECK_INTERVAL;
                                adminData.lastVoiceXPTime = now;

                                this.updateAdminData(member.id, adminData);
                                console.log(`Ses XP əlavə edildi - İstifadəçi: ${member.user.tag}, XP: ${xpToAdd}`);
                            }
                        });
                    });
                });
            } catch (error) {
                console.error('Admin Ses XP yoxlama xətası:', error);
            }
        }, XP_SETTINGS.VOICE_CHECK_INTERVAL);
    }

    // Admin rolü kontrolü
    hasAdminPermission(member) {
        try {
            const { hasPermission } = require('../../utils/permissions');
            return hasPermission(member);
        } catch (error) {
            console.error('Admin rol kontrolü hatası:', error);
            return false;
        }
    }

    // Admin verilerini al
    getAdminData(userId) {
        if (!this.adminData.has(userId)) {
            this.adminData.set(userId, { 
                xp: 0, 
                voiceTime: 0, 
                ticketsClosed: 0, 
                lastXPTime: 0,
                lastVoiceXPTime: 0 
            });
        }
        return this.adminData.get(userId);
    }

    // Admin verilerini güncelle
    updateAdminData(userId, data) {
        this.adminData.set(userId, data);
        // Değişiklikten sonra verileri kaydet
        this.saveData();
    }

    // Mesaj XP'si ekle
    async addMessageXP(userId, channelId) {
        const now = Date.now();
        const adminData = this.getAdminData(userId);
        const lastTime = adminData.lastXPTime || 0;
        
        if (now - lastTime >= XP_SETTINGS.MESSAGE_COOLDOWN) {
            let xpToAdd = XP_VALUES.MESSAGE_XP;

            // Kanal grubuna göre ek XP ekle
            if (CHANNEL_GROUPS.INTERVIEW_CHANNELS.includes(channelId)) {
                xpToAdd += XP_VALUES.INTERVIEW_CHANNEL_XP;
            } else if (CHANNEL_GROUPS.SUPPORT_CHANNELS.includes(channelId)) {
                xpToAdd += XP_VALUES.SUPPORT_CHANNEL_XP;
            }

            adminData.xp += xpToAdd;
            adminData.lastXPTime = now;
            
            this.updateAdminData(userId, adminData);
            await this._logXPChange(userId, xpToAdd, 'Mesaj');
        }
    }

    // Ticket kapatma XP'si
    async addTicketCloseXP(userId) {
        const adminData = this.getAdminData(userId);
        adminData.xp += XP_VALUES.TICKET_CLOSE;
        adminData.ticketsClosed += 1;
        
        this.updateAdminData(userId, adminData);
        await this._logXPChange(userId, XP_VALUES.TICKET_CLOSE, 'Ticket Bağlama');
    }

    // Hikaye onaylama XP'si
    async addStoryApprovalXP(userId) {
        const adminData = this.getAdminData(userId);
        adminData.xp += XP_VALUES.INTERVIEW_CHANNEL_XP;
        
        this.updateAdminData(userId, adminData);
        await this._logXPChange(userId, XP_VALUES.INTERVIEW_CHANNEL_XP, 'Hekayə Təsdiqi');
    }

    // Hikaye reddetme XP'si
    async addStoryRejectionXP(userId) {
        const adminData = this.getAdminData(userId);
        adminData.xp += XP_VALUES.INTERVIEW_CHANNEL_XP;
        
        this.updateAdminData(userId, adminData);
        await this._logXPChange(userId, XP_VALUES.INTERVIEW_CHANNEL_XP, 'Hekayə Rəddi');
    }

    // Admin çağrısına yanıt XP'si
    async addAdminCallResponseXP(userId) {
        const adminData = this.getAdminData(userId);
        adminData.xp += XP_VALUES.SUPPORT_CHANNEL_XP;
        
        this.updateAdminData(userId, adminData);
        await this._logXPChange(userId, XP_VALUES.SUPPORT_CHANNEL_XP, 'Admin Çağrısına Yanıt');
    }

    // Ses kanalına katılma olayı
    handleVoiceStateUpdate(oldState, newState) {
        const userId = newState.member.id;
        
        // Bot kontrolü
        if (newState.member.user.bot) return;
        
        // Admin rolü kontrolü
        if (!this.hasAdminPermission(newState.member)) return;
        
        // Ses kanalına giriş
        if (!oldState.channelId && newState.channelId) {
            this.voiceStates.set(userId, { joinTime: Date.now() });
        }
        // Ses kanalından çıkış
        else if (oldState.channelId && !newState.channelId) {
            const voiceState = this.voiceStates.get(userId);
            if (voiceState) {
                const timeInVoice = Date.now() - voiceState.joinTime;
                const adminData = this.getAdminData(userId);
                
                adminData.voiceTime += timeInVoice;
                this.updateAdminData(userId, adminData);
                
                this.voiceStates.delete(userId);
            }
        }
        // Ses kanalı değişimi
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            // Eski kanalda geçirilen süre için güncelle
            const voiceState = this.voiceStates.get(userId);
            if (voiceState) {
                const timeInVoice = Date.now() - voiceState.joinTime;
                const adminData = this.getAdminData(userId);
                
                adminData.voiceTime += timeInVoice;
                this.updateAdminData(userId, adminData);
                
                // Yeni kanal için zamanı güncelle
                this.voiceStates.set(userId, { joinTime: Date.now() });
            }
        }
    }

    // XP değişikliğini loglama
    async _logXPChange(userId, amount, action) {
        // XP değişikliklerini loglamayı devre dışı bıraktık
        return;
    }

    // Admin XP'sini getir
    getAdminXP(userId) {
        const adminData = this.getAdminData(userId);
        return adminData.xp;
    }

    // Admin istatistiklerini getir
    getAdminStats(userId) {
        return this.getAdminData(userId);
    }

    // Admin istatistiklerini embed olarak getir
    async getAdminStatsEmbed(userId) {
        try {
            const user = await this.client.users.fetch(userId);
            const stats = this.getAdminData(userId);
            
            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('👑 Admin Statistikaları')
                .setDescription(`@${user.username} admininin statistikaları`)
                .setThumbnail(user.displayAvatarURL())
                .addFields(
                    { 
                        name: '📊 Əsas Məlumatlar',
                        value: `👑 Ümumi XP: ${stats.xp}\n🎫 Bağlanan Ticket: ${stats.ticketsClosed || 0}\n⏱️ Səs Müddəti: ${this.formatVoiceTime(stats.voiceTime)}`,
                        inline: false
                    },
                    {
                        name: '⚡ XP Qazanma',
                        value: `💬 Mesaj: ${XP_VALUES.MESSAGE_XP} XP\n🔊 Səs (Saat): ${XP_VALUES.VOICE_XP_PER_MINUTE * 60} XP\n🎫 Ticket: ${XP_VALUES.TICKET_CLOSE} XP`,
                        inline: false
                    },
                    {
                        name: '🕒 Son Aktivlik',
                        value: `📅 Son XP: ${stats.lastXPTime ? `<t:${Math.floor(stats.lastXPTime / 1000)}:R>` : 'bir gün öncə'}`,
                        inline: false
                    }
                )
                .setFooter({ text: 'GCA Roleplay - Admin XP Sistemi' })
                .setTimestamp();
                
            return embed;
        } catch (error) {
            console.error('Admin stats embed oluşturma hatası:', error);
            return new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Hata')
                .setDescription('İstatistikler yüklenirken bir hata oluştu.');
        }
    }

    // Tüm admin XP'lerini getir
    getAllAdminXP() {
        return Array.from(this.adminData.entries()).map(([userId, data]) => ({
            userId,
            xp: data.xp,
            voiceTime: data.voiceTime,
            ticketsClosed: data.ticketsClosed
        }));
    }

    // Tüm adminlerin istatistiklerini embed olarak getir
    async getAllAdminStatsEmbed() {
        try {
            // Tüm admin verilerini al ve XP'ye göre sırala
            const allAdmins = Array.from(this.adminData.entries())
                .map(([userId, data]) => ({
                    userId,
                    ...data
                }))
                .sort((a, b) => b.xp - a.xp); // XP'ye göre azalan sıralama

            const embed = new EmbedBuilder()
                .setColor('#ff9900')
                .setTitle('👑 Bütün Adminlərin Statistikaları')
                .setDescription('XP sıralamasına görə bütün adminlərin statistikaları')
                .setThumbnail('https://media.discordapp.net/attachments/1334683202861793280/1334683202861793280/gca.gif');

            // Her admin için sıralı bilgileri ekle
            let description = '';
            for (let i = 0; i < allAdmins.length; i++) {
                const admin = allAdmins[i];
                try {
                    const user = await this.client.users.fetch(admin.userId);
                    description += `**${i + 1}.** <@${admin.userId}> | ${user.tag}\n`;
                    description += `> 📊 XP: \`${Math.floor(admin.xp)}\` | 🎫 Ticket: \`${admin.ticketsClosed || 0}\` | ⏱️ Səs: \`${this.formatVoiceTime(admin.voiceTime)}\`\n\n`;
                } catch (error) {
                    console.error(`Admin bilgisi alınamadı (${admin.userId}):`, error);
                    continue;
                }
            }

            embed.setDescription(description);
            embed.setFooter({ text: 'GCA Roleplay - Admin XP Sistemi' });
            embed.setTimestamp();

            return embed;
        } catch (error) {
            console.error('Tüm admin istatistikleri embed oluşturma hatası:', error);
            return new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Hata')
                .setDescription('İstatistikler yüklenirken bir hata oluştu.');
        }
    }

    // XP sıfırlama
    resetXP(userId) {
        this.adminData.delete(userId);
        this.saveData();
    }

    // Tüm XP'leri sıfırlama
    resetAllXP() {
        this.adminData.clear();
        this.saveData();
    }
    
    // Ses süresini formatlama
    formatVoiceTime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days} gün ${hours % 24} saat`;
        } else if (hours > 0) {
            return `${hours} saat ${minutes % 60} dakika`;
        } else {
            return `${minutes} dakika`;
        }
    }
}

module.exports = AdminXPSystem; 
