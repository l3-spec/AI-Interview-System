require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
    try {
        console.log('Connecting to database...');
        const connection = await mysql.createConnection(process.env.DATABASE_URL);
        console.log('Connected successfully.');

        const queries = [
            'ALTER TABLE ai_interview_questions MODIFY answerVideoUrl TEXT',
            'ALTER TABLE ai_interview_questions MODIFY audioUrl TEXT',
            'ALTER TABLE ai_interview_questions MODIFY audioPath TEXT',
            'ALTER TABLE ai_interview_questions MODIFY answerText TEXT',
            'ALTER TABLE ai_interview_questions MODIFY answerVideoPath TEXT',
            'ALTER TABLE ai_interview_questions MODIFY videoUrl TEXT'
        ];

        for (const query of queries) {
            try {
                await connection.execute(query);
                console.log(`✅ Executed: ${query}`);
            } catch (error) {
                console.error(`❌ Failed: ${query}`, error.message);
            }
        }

        await connection.end();
        console.log('Done.');
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

main();
