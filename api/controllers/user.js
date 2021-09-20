'use strict'
//modulos
var bcrypt = require('bcrypt-nodejs');

var mongoosePaginate = require('mongoose-pagination');

var User = require('../models/user');
var jwt = require('../services/jwt');


function home(req,res){
    res.status(200).send({
        message: 'superHome'
    })
}

function test(req,res){
    console.log(req.body)
    res.status(200).send({
        message: 'thisIsAtest'
    })
}

function saveUser(req,res){
    var params = req.body;
    var user = new User();

    if(params.name && params.surname && params.nick && params.email && params.password){
        user.name = params.name;
        user.surname = params.surname;
        user.nick = params.nick;
        user.email = params.email;
        user.role = 'ROLE_USER';
        user.image = null;

        //control de usuarios duplicados
        User.find({$or: [
            {email: user.email.toLowerCase()},
            {nick: user.nick.toLowerCase()}
        ]}).exec((err,users)=>{
            if(err) return res.status(500).send({message: ' error'});

            if(users && users.length >= 1){
                return res.status(200).send({message: 'El usuario ya existe'});
            }else{
                //cifra el password y guarda los datos
                bcrypt.hash(params.password, null, null,(err,hash)=>{
                    user.password = hash;

                    user.save((err,userStored)=>{
                        if(err) return res.status(500).send({message: 'error al guardar usuario'});

                        if(userStored){
                            res.status(200).send({user: userStored});
                        }else{
                            res.status(404).send({message: 'no se ha registrado el usuario'});
                        }
                    })
                })
            }
        });

    }else{
        res.status(200).send({
            message: 'asegurate de llenar todos los campos'
        });
    }
}

function loginUser(req,res){
    var params = req.body;

    var email = params.email;
    var password = params.password;

    User.findOne({email: email},(err,user) =>{

        if(err) return res.status(500).send({message: 'error en la peticion'});

        if(user){
            bcrypt.compare(password, user.password,(err,check) =>{
                if(check){
                    if(params.gettoken){
                        //crear token
                        return res.status(200).send({
                            token: jwt.createToken(user)
                        })
                    }else{
                        // traer datos ignorando el password
                        user.password = undefined;
                        return res.status(200).send({user});
                    }
                }else{
                    return res.status(404).send({message: 'error usuario o contraseña incorrectas'});
                }
            });
        }else{
            return res.status(404).send({message: 'error usuario incorrecto'});
        }
    });  
}

function getUser(req,res){
    var userId = req.params.id;

    User.findById(userId, (err, user) => {        
        if(err) return res.status(500).send({message: 'error en la peticion'});

        if(!user) return res.status(404).send({message: 'el usuario no existe'});

        return res.status(200).send({user}); 
    })
}

function getUsers(req,res){
    var identity_user_id = req.user.sub;
    var page = 1;
    if(req.params.page){
        page = req.params.page;
    }
    var itemsPerPage = 5;
    User.find().sort('_id').paginate(page,itemsPerPage,(err,users,total)=>{
        if(err) return res.status(500).send({message: 'error en la peticion'});

        if(!users) return res.status(404).send({message:'no hay usuarios disponibles'});

        return res.status(200).send({
            users,
            total,
            pages: Math.ceil(total/itemsPerPage)
        })
    });
}

function updateUser(req,res){
    var userId = req.params.id;
    var update = req.body;
    // borrar prpiedad password
    delete update.password;
    if(userId != req.user.sub){
        res.status(500).send({message:'no tienes los permisos necesarios'});
    }
    User.findByIdAndUpdate(userId, update, {new: true}, (err,userUpdated)=>{
        if(err) return res.status(500).send({message:'error en la peticion'});
        if(!userUpdated) return res.status(404).send({message:'no se ha podido actualizar el usuario'});
        return res.status(200).send({user: userUpdated});
    })
}

module.exports = {
    home,
    test,
    saveUser,
    loginUser,
    getUser,
    getUsers,
    updateUser
}