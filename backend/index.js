require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();
const port = 3000;
const JWT_SECRET = process.env.JWT_SECRET;

// Conectar a MongoDB
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log("Conectado a MongoDB Atlas"))
    .catch((err) => console.error("Error al conectar a MongoDB Atlas", err));

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    groups: { type: Map, of: [String] },
    location: {
        latitud: Number,
        longitud: Number,
    },
});

const User = mongoose.model("User", UserSchema);
const dbOperations = require("./dbOperaciones");

app.use(bodyParser.json());
app.use(cors());

// Middleware para verificar el token JWT
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Acceso denegado" });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: "Token inválido" });
        req.userId = decoded.id;
        next();
    });
};

app.post("/registro", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res
                .status(400)
                .json({ message: "El correo electrónico ya está registrado" });
        }

        // Si no existe, procede con el registro
        const hashedPassword = await bcrypt.hash(password, 10);

        // Define los grupos por defecto
        const gruposPorDefecto = ["familia", "amigos", "trabajo"];

        const user = new User({
            email,
            password: hashedPassword,
            groups: gruposPorDefecto.reduce((acc, grupo) => {
                acc.set(grupo, []);
                return acc;
            }, new Map()),
        });

        await user.save();
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        res.json({ token });
    } catch (err) {
        console.error("Error al registrar el usuario:", err);
        res.status(500).json({ message: "Error al registrar el usuario" });
    }
});

app.post("/acceso", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user)
            return res.status(400).json({ message: "Usuario no encontrado" });
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid)
            return res.status(400).json({ message: "Contraseña incorrecta" });
        const token = jwt.sign({ id: user._id }, JWT_SECRET);
        res.json({ token });
    } catch (err) {
        console.error("Error al iniciar sesión:", err);
        res.status(500).json({ message: "Error al iniciar sesión" });
    }
});

app.post("/agregar-grupo", verifyToken, async (req, res) => {
    try {
        const { email, grupo } = req.body;

        const usuarioSolicitante = await User.findById(req.userId);
        const usuarioAAgregar = await User.findOne({ email });

        if (!usuarioAAgregar)
            return res.status(400).json({ message: "Usuario no encontrado" });

        if (usuarioSolicitante.email === email) {
            return res.status(400).json({
                message: "No puedes agregar tu propio email al grupo",
            });
        }

        if (!usuarioSolicitante.groups.has(grupo)) {
            usuarioSolicitante.groups.set(grupo, []);
        }

        const grupoActual = usuarioSolicitante.groups.get(grupo);
        if (!grupoActual.includes(email)) {
            grupoActual.push(email);
            usuarioSolicitante.groups.set(grupo, grupoActual);
            await usuarioSolicitante.save();
        }

        res.json({ message: "Usuario agregado al grupo" });
    } catch (err) {
        console.error("Error al agregar usuario al grupo:", err);
        res.status(500).json({ message: "Error al agregar usuario al grupo" });
    }
});

app.get("/leer-ubicacion", verifyToken, async (req, res) => {
    try {
        const usuario = await User.findById(req.userId);
        console.log("Usuario encontrado:", usuario); // Añadir este log
        if (!usuario)
            return res.status(400).json({ message: "Usuario no encontrado" });

        console.log("Ubicación del usuario:", usuario.location);

        if (
            usuario.location &&
            usuario.location.latitud &&
            usuario.location.longitud
        ) {
            res.json({
                latitud: usuario.location.latitud,
                longitud: usuario.location.longitud,
            });
        } else {
            res.status(400).json({ message: "Ubicación no encontrada" });
        }
    } catch (err) {
        console.error("Error al leer la ubicación:", err);
        res.status(500).json({ message: "Error al leer la ubicación" });
    }
});

app.post("/actualizar-ubicacion", verifyToken, async (req, res) => {
    try {
        const { latitud, longitud } = req.body;

        const usuario = await User.findById(req.userId);
        if (!usuario)
            return res.status(400).json({ message: "Usuario no encontrado" });

        usuario.location = { latitud, longitud };
        await usuario.save();

        res.json({ message: "Ubicación actualizada" });
    } catch (err) {
        console.error("Error al actualizar ubicación:", err);
        res.status(500).json({ message: "Error al actualizar ubicación" });
    }
});

app.get("/ubicaciones", verifyToken, async (req, res) => {
    try {
        const { grupo } = req.query;
        console.log("Grupo recibido:", grupo); // Añadido para depuración

        const usuarioSolicitante = await User.findById(req.userId);

        console.log(
            "Grupos del usuario:",
            Array.from(usuarioSolicitante.groups.keys())
        );

        if (!usuarioSolicitante.groups.has(grupo)) {
            return res
                .status(400)
                .json({ message: "El grupo especificado no existe" });
        }

        const emailsDelGrupo = usuarioSolicitante.groups.get(grupo);
        const ubicaciones = await User.find(
            { email: { $in: emailsDelGrupo } },
            { email: 1, location: 1 }
        );

        res.json(ubicaciones);
    } catch (err) {
        console.error("Error al obtener ubicaciones:", err);
        res.status(500).json({ message: "Error al obtener ubicaciones" });
    }
});

// Ruta para obtener todos los usuarios
app.get("/usuarios", verifyToken, async (req, res) => {
    try {
        const usuarios = await dbOperations.obtenerTodosLosUsuarios();
        res.json(usuarios);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ message: "Error al obtener usuarios" });
    }
});

// Ruta para buscar usuario por email
app.get("/usuario/:email", verifyToken, async (req, res) => {
    const { email } = req.params;
    try {
        const usuario = await dbOperations.buscarUsuarioPorEmail(email);
        if (!usuario) {
            return res.status(404).json({ message: "Usuario no encontrado" });
        }
        res.json(usuario);
    } catch (error) {
        console.error("Error al buscar usuario:", error);
        res.status(500).json({ message: "Error al buscar usuario" });
    }
});

// Ruta para eliminar todos los usuarios (solo para fines de desarrollo)
app.delete("/usuarios", verifyToken, async (req, res) => {
    try {
        const result = await dbOperations.eliminarTodosLosUsuarios();
        res.json({ message: `Se eliminaron ${result.deletedCount} usuarios` });
    } catch (error) {
        console.error("Error al eliminar usuarios:", error);
        res.status(500).json({ message: "Error al eliminar usuarios" });
    }
});

app.listen(port, () => {
    console.log(`Servidor ejecutándose en http://localhost:${port}`);
});
