// dbOperations.js

const mongoose = require("mongoose");
const User = mongoose.model("User");

async function eliminarTodosLosUsuarios() {
    const result = await User.deleteMany({});
    console.log("Se eliminaron", result.deletedCount, "usuarios.");
    return result;
}

async function buscarUsuarioPorEmail(email) {
    const usuario = await User.findOne({ email });
    return usuario;
}

async function obtenerTodosLosUsuarios() {
    const usuarios = await User.find({}, "email");
    return usuarios;
}

module.exports = {
    eliminarTodosLosUsuarios,
    buscarUsuarioPorEmail,
    obtenerTodosLosUsuarios,
};
