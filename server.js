const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');

const app = express();

// --- Middleware ---
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// --- MongoDB Connection ---
mongoose.connect('mongodb://127.0.0.1:27017/divya-darshan')
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("DB Connection Error:", err));

// --- Schemas ---
const User = mongoose.model('User', new mongoose.Schema({
    name: String,
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true }
}));

const Booking = mongoose.model('Booking', new mongoose.Schema({
    userEmail: String,
    temple: String,
    date: String,
    slot: String,
    bookingDate: { type: Date, default: Date.now }
}));

// --- Temple Data Object ---
const templesData = {
    "kashi": {
        name: "Kashi Vishwanath",
        location: "Varanasi, UP",
        food: "Kachori Sabzi, Banarasi Thandai, Malaiyo",
        history: "Kashi is one of the oldest inhabited cities... [truncated]",
        images: ["kashi1.png", "kashi2.jpg"]
    },
    "somnath": {
        name: "Somnath Mandir",
        location: "Gujarat",
        food: "Gujarati Thali, Dhokla",
        history: "First among the twelve Jyotirlingas.",
        images: ["somnath.png", "somnath2.jpg"]
    },
    "kedarnath": {
        name: "Kedarnath Dham",
        location: "Uttarakhand",
        description: "Kedarnath Temple is one of the most sacred Hindu temples dedicated to Lord Shiva. It is located in the Himalayan region near the Mandakini River in Uttarakhand. The temple is also an important part of the Char Dham pilgrimage.",
        food: "Garam Halwa aur Khichdi",
        images: ["kedarnath.png"]
    }
};

// --- GET Routes (Pages) ---
app.get('/', (req, res) => res.render('index'));
app.get('/signup', (req, res) => res.render('signup'));
app.get('/login', (req, res) => res.render('login'));
app.get('/book', (req, res) => res.render('book'));
app.get('/explore', (req, res) => res.render('explore'));

// --- Logic Routes ---

// Sign Up
app.post('/signup', async (req, res) => {
    try {
        const newUser = new User(req.body);
        await newUser.save();
        res.redirect('/login');
    } catch (err) {
        res.status(400).send("Error: User already exists or invalid data.");
    }
});

// Login
app.post('/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email, password: req.body.password });
    if (user) {
        res.redirect('/book'); 
    } else {
        res.send("Invalid Credentials");
    }
});

// Explore Specific Temple
app.get('/explore/:templeKey', (req, res) => {
    const temple = templesData[req.params.templeKey];
    if (temple) {
        res.render('temple-details', { temple: temple });
    } else {
        res.status(404).send("Temple not found");
    }
});

// Booking Process: Checkout
app.post('/checkout', (req, res) => {
    const { temple, date, slot } = req.body;
    res.render('checkout', { temple, date, slot });
});

// Final Booking Confirmation
app.post('/confirm', async (req, res) => {
    try {
        const { temple, date, slot, email } = req.body; 
        const newBooking = new Booking({ userEmail: email, temple, date, slot });
        await newBooking.save();

        res.render('confirmation', { temple, date, slot, email });
    } catch (err) {
        res.status(500).send("Booking error: " + err.message);
    }
});

// Booking History
app.get('/history/:email', async (req, res) => {
    try {
        const userBookings = await Booking.find({ userEmail: req.params.email });
        res.render('history', { bookings: userBookings });
    } catch (err) {
        res.status(500).send("Error fetching history");
    }
});

// PDF Receipt Generation
app.post('/download-receipt', (req, res) => {
    const { temple, date, slot } = req.body;
    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Darshan_Receipt.pdf');

    doc.rect(0, 0, 612, 100).fill('#081A39'); 
    doc.fillColor('#FFD700').fontSize(25).text('DIVYA DARSHAN', 50, 40); 
    
    doc.fillColor('black').fontSize(18).text('Official Booking Receipt', 50, 120);
    doc.moveDown().fontSize(12);
    doc.text(`Temple: ${temple}`);
    doc.text(`Date of Darshan: ${date}`);
    doc.text(`Time Slot: ${slot}`);
    doc.text(`Status: CONFIRMED`, { underline: true });
    
    doc.moveDown(5).text('Carry a valid Photo ID proof for entry.', { align: 'center', color: 'gray' });

    doc.pipe(res);
    doc.end();
});

// Admin Dashboard
app.get('/admin-dashboard', async (req, res) => {
    try {
        const allUsers = await User.find({});
        const allBookings = await Booking.find({});
        res.render('admin', { users: allUsers, bookings: allBookings });
    } catch (err) {
        res.status(500).send("Admin access error");
    }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));