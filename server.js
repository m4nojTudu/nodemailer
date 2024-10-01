require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const { simpleParser } = require('mailparser');
const { ImapFlow } = require("imapflow");
const path = require('node:path');
const fs = require('fs'); // Import fs module for file system operations

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, "public")));

// Nodemailer setup for sending email
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// File path for storing sent emails
const sentEmailsFilePath = path.join(__dirname, 'sent_emails.json');

// Function to save sent email to JSON file
const saveSentEmail = (emailData) => {
    // Check if the file exists
    if (!fs.existsSync(sentEmailsFilePath)) {
        // If the file doesn't exist, create an empty array and write it to the file
        fs.writeFileSync(sentEmailsFilePath, JSON.stringify([]));
    }

    // Read the current contents of the file
    const existingEmails = JSON.parse(fs.readFileSync(sentEmailsFilePath));

    // Add the new email data to the list
    existingEmails.push(emailData);

    // Write the updated list back to the file
    fs.writeFileSync(sentEmailsFilePath, JSON.stringify(existingEmails, null, 2)); // Pretty print JSON
};

// Endpoint to send email
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

        // Prepare email data to store
        const emailData = {
            from: process.env.EMAIL_FROM,
            to,
            subject,
            text,
            date: new Date().toISOString(),
            messageId: info.messageId
        };

        // Save the sent email to JSON file
        saveSentEmail(emailData);

        res.status(200).send('Email sent successfully');
    });
});

// IMAP to fetch received emails
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

            for await (const message of client.fetch(messages, { source: true })) {
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

app.get('/get-emails', async (req, res) => {
    try {
        const emails = await fetchEmails();
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
