// @ts-ignore
const Config = require("./config.json");
const Core = require("../core");
const CronJob = require("cron").CronJob;
const DiscordUtil = Core.util;
const GuildData = require("./models/guild-data.js");

// @ts-ignore
const client = new Core.Client(require("../token.json"), __dirname + "/commands", GuildData);

client.on("beforeLogin", () => {
    new CronJob(Config.activityUpdateSchedule, checkUsersInAllGuilds, null, true);
});

client.on("ready", checkUsersInAllGuilds);

client.on("message", message => {
    if (message.guild && message.member)
        GuildData.findOne({ guildID: message.guild.id })
            .then(guildData => registerActivity(message.guild, message.member, guildData));
});

client.on("voiceStateUpdate", member => {
    GuildData.findOne({ guildID: member.guild.id })
        .then(guildData => registerActivity(member.guild, member, guildData));
});

client.bootstrap();

function checkUsersInAllGuilds() {
    client.guilds.forEach(guild =>
        GuildData.findOne({ guildID: guild.id })
            .then(guildData => guildData && guildData.checkUsers(client)));
}

function registerActivity(guild, member, guildData) {
    if (member && guildData && member.id !== client.user.id) {
        guildData.users[member.id] = new Date(); //store now as the latest date this user has interacted

        if (guildData.allowRoleAddition && guildData.activeRoleID && guildData.activeRoleID.length > 0) { //check if we're allowed to assign roles as well as remove them in this guild
            let activeRole = guild.roles.get(guildData.activeRoleID);

            if (activeRole
                && !member.roles.get(activeRole.id) //member doesn't already have active role
                && !guildData.ignoredUserIDs.includes(member.id) //member isn't in the list of ignored member ids
                && !member.roles.some(role => guildData.ignoredRoleIDs.includes(role.id))) //member doesn't have one of the ignored role ids
            {
                member.addRole(activeRole)
                    .catch(err => DiscordUtil.dateError("Error adding active role to user " + member.user.username + " in guild " + guild.name, err.message || err));
            }
        }
        guildData.save();
    }
}