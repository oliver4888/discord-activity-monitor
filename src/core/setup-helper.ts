import { Client, DisharmonyMessage, Question } from "@oliver4888/disharmony"
import Guild from "../models/guild"
import Message from "../models/message"

const steps = [
    {
        message: "How many days would you like to set the inactive threshold at?",
        action: (answer: DisharmonyMessage, guild: Guild) => {
            // Expect the message to be an integer value
            const response = parseInt(answer.content, 10)
            if (response && response > 0)
                guild.inactiveThresholdDays = response
            else
                return "Value must be a whole number of days greater than 0"
        },
    },
    {
        message: "Please @mention the role you wish to use to indicate an *active* user",
        action: (answer: DisharmonyMessage, guild: Guild) => {
            // Expect the message to be in the format @<snowflake>
            if (answer.mentions.roles.size > 0)
                guild.activeRoleId = answer.mentions.roles.first().id
            else
                return "You must @mention an existing role"
        },
    },
    {
        message: "Would you like the bot to *add* people to this role if they send a message and *don't* already have it? (yes/no)",
        action: (answer: DisharmonyMessage, guild: Guild) => {
            // Expect the message to be "yes" or "no"
            const msg = answer.content.toLowerCase()
            if (msg === "yes" || msg === "no")
                guild.allowRoleAddition = msg === "yes"
            else
                return "Please respond with either 'yes' or 'no'"
        },
    },
    {
        message: "Please @mention the role you wish to use to indicate an *inactive* user, or type 'disable' if you don't want this feature",
        action: (answer: DisharmonyMessage, guild: Guild) => {
            if (answer.mentions.roles.size > 0)
                guild.inactiveRoleId = answer.mentions.roles.first().id
            else if (answer.content.toLowerCase() === "disable")
                guild.inactiveRoleId = "disabled"
            else
                return "Please @mention a role or say 'disable'"
        },
    },
    {
        message: "Please @mention any *members* or *roles* who are to be exempt from being marked/unmarked as active (or type 'none')",
        action: (answer: DisharmonyMessage, guild: Guild) => {
            guild.ignoredRoleIds = []
            guild.ignoredUserIds = []
            if (answer.mentions.members.size > 0 || answer.mentions.roles.size > 0) {
                answer.mentions.members.forEach(member => guild.ignoredUserIds.push(member.id))
                answer.mentions.roles.forEach(role => guild.ignoredRoleIds.push(role.id))
            }
            else if (answer.content.toLowerCase() !== "none")
                return "Please either @mention some members or type 'none'"
        },
    },
]

export default class SetupHelper {
    public async walkThroughSetup(client: Client, message: Message): Promise<void> {
        for (const step of steps) {
            let queryStr: string | undefined = step.message
            while (queryStr) {
                const question = new Question(client, message.channelId, queryStr, message.member, true)
                const answer: DisharmonyMessage = await question.send() // TODO better handling for question errors (currently just caught by caller)
                queryStr = step.action(answer, message.guild)
                if (queryStr)
                    queryStr += ". Please try again."
            }
        }
    }
}