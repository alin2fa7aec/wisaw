import type { SNSEvent } from "aws-lambda";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({});
const TABLE_NAME = process.env.TABLE_NAME!;

interface SESNotification {
    notificationType: "Bounce" | "Complaint";
    bounce?: { bouncedRecipients: { emailAddress: string }[] };
    complaint?: { complainedRecipients: { emailAddress: string }[] };
}

export const handler = async (event: SNSEvent): Promise<void> => {
    for (const record of event.Records) {
        const message: SESNotification = JSON.parse(record.Sns.Message);
        const emails: string[] = [];

        if (message.notificationType === "Bounce" && message.bounce) {
            for (const r of message.bounce.bouncedRecipients) {
                emails.push(r.emailAddress.toLowerCase());
            }
        } else if (
            message.notificationType === "Complaint" &&
            message.complaint
        ) {
            for (const r of message.complaint.complainedRecipients) {
                emails.push(r.emailAddress.toLowerCase());
            }
        }

        for (const email of emails) {
            await ddb.send(
                new PutItemCommand({
                    TableName: TABLE_NAME,
                    Item: marshall({
                        pk: `suppressed#${email}`,
                        reason: message.notificationType,
                        suppressedAt: new Date().toISOString(),
                    }),
                }),
            );
            console.log(`Suppressed: ${email} (${message.notificationType})`);
        }
    }
};
