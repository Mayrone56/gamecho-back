const request = require('supertest');
// Importez mongoose pour fermer la connexion après le test
const mongoose = require('mongoose');
const app = require('./app');

// Mock du modèle User pour éviter l'accès réel à la BDD
jest.mock('./models/users');

//Route Get /users
it('should respond with a resource', async () => {
    const res = await request(app)
        .get('/users')
        .expect(200);

    expect(res.text).toBe('respond with a resource');
});

//Route post /users/signup
//Describe permet de mieux organiser son code en regroupant plusieurs tests
describe('POST /users/signup', () => {

    it('should return an error if fields are missing', async () => {
        const res = await request(app)
            .post('/users/signup')
            .send({
                username: 'testUser',
                // Email manquant
                password: 'password123',
                confirmPassword: 'password123'
            })

        expect(res.statusCode).toBe(200);
        expect(res.body.result).toBe(false);
        expect(res.body.error).toBe('Missing or empty fields');
    });

    it('should return an error if passwords do not match', async () => {
        const res = await request(app)
            .post('/users/signup')
            .send({
                username: 'testUser',
                email: 'testuser@example.com',
                password: 'password123',
                //MDP différent
                confirmPassword: 'differentPassword'
            })

        expect(res.statusCode).toBe(200);
        expect(res.body.result).toBe(false);
        expect(res.body.error).toBe('Passwords do not match');
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });
});