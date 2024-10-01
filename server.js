require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const { simpleParser} = require('mailparser');
const { ImapFlow} = require("imapflow");
const path = require('node:path');
const fs = require('fs');

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")));

//Nodemailer setup sending email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

//Store emails on JSON file
const sentEmailsFilePath = path.join(__dirname, 'sent_emails.json');

// fucntion to save the email
const saveSentEmail= (emailData) => {

    // Check if the file exiists
    if (!fs.existsSync(sentEmailsFilePath)) {

        fs.writeFileSync(sentEmailsFilePath, JSON.stringify([]));
    }
    const existingEmails=JSON.parse(fs.readFileSync(sentEmailsFilePath));

    existingEmails.push(emailData);
    fs.writeFileSync(sentEmailsFilePath, JSON.stringify(existingEmails, null, 2));
}

//Endpoint to send email
app.post('/send-email', (req, res) => {
    const { to, subject, text } = req.body;

    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to,
        subject,
        text
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log(error);
            return res.status(500).send(error.toString());
        }

        // prepare to store email
        const emailData = {
            from: process.env.EMAIL_FROM,
            to,
            subject,
            text,
            date: new Date().toISOString(),
            messageID: info.messageId
        };

        saveSentEmail(emailData);
        
        res.status(200).send('Email sent successfully');
    });
});

//IMAP to fetch received emails
async function fetchEmails() {
    const client = new ImapFlow({
        host: process.env.IMAP_HOST,
        port: process.env.IMAP_PORT,
        secure: true,
        auth: {
            user: process.env.EMAIL_USER_IMAP,
            pass: process.env.EMAIL_PASS_IMAP
        }
    });

    try {
        await client.connect();
        console.log('Connected to IMAP server');
        const lock = await client.getMailboxLock('INBOX');
        try {
            const messages = await client.search({ seen: false });
            const emailList = [];

            for await (const message of client.fetch(messages, { source:true })) {
                const parsed = await simpleParser(message.source);

                emailList.push({
                    from: parsed.from?.text || 'Unknown Sender',
                    subject: parsed.subject || 'No Subject',
                    date: parsed.date || 'No Date',
                    body: parsed.text || 'No Body'
                });
            }
            return emailList;
        } finally {
            lock.release();
        }

    } finally {
        await client.logout();
        console.log('Disconnected from IMAP server');
    }
}

app.get('/get-emails', async (req, res)=> {
    try {
        const emails =await fetchEmails();
        res.json(emails);
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).send('Error fetching emails');
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});