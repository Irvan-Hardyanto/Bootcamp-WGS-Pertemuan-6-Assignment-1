//import library express.js dan library lain yg diperlukan
const express = require('express');
const fs = require('fs');
const validator = require('validator');
const url = require('url');
//body: untuk memeriksa variabel tersebut memiliki isi yang sesuai
const { body, validationResult, check } = require('express-validator');
const { default: isEmail } = require('validator/lib/isemail');

//inisialisasi objek express.js
const app = express();
const port = 3000;//port number
const region = 'id-ID';

//direktori dan nama file kontak.
const dirPath = 'data';//bisa diimprove lebih lanjut
const dataPath = 'data/contacts.json';//bisa diimprove lebih lanjut


//periksa apakah folder 'data' sudah dibuat
if (!fs.existsSync(dirPath)) {
    //jika belum, maka buat folder data
    fs.mkdirSync(dirPath);
}

//periksa apakah berkas contacts.json sudah dibuat
if (!fs.existsSync(dataPath)) {
    //jika belum, maka buat file contacts.json
    fs.writeFileSync(dataPath, '[]');
}

//set view engine menggunakan ejs
app.set('view engine', 'ejs');

//referensi: http://expressjs.com/en/4x/api.html#req.body
//middleware untuk body-parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//middleware untuk mengakses static files.
app.use(express.static('public'))

//Baca berkas.json secara asinkronus
//method ini mengembalikan sebuah Promise yang akan di resolve menjadi konten dari file yg dibaca
const loadContact = () => {
    const file = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(file);
}

const loadContactAsync = () => {
    return new Promise((resolve, reject) => {
        fs.readFile(dataPath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(JSON.parse(data));
            }
        });
    });
}

//fungsi untuk menyimpan kontak ke berkas.json
const saveContact = (contacts) => {
    fs.writeFileSync(dataPath, JSON.stringify(contacts));//tulis data yang baru ke dalam berkas .json
    console.log('Terimakasih sudah memasukkan data!');
}

//fungsi untuk memeriksa apakah sebuah kontak sudah pernah dibuat sebelumnya
const isDuplicate = (contacts, name) => {
    return contacts.find(contact => { return contact.name === name });
}

//fungsi untuk menambah kontak baru
const addContact = (contacts, newContact) => {
    contacts.push(newContact);//tambahkan nama,nomor telepon, dan email yang baru saja dibaca dari cmd
    saveContact(contacts);
    return true;
}

//fungsi untuk mencari kontak dengan nama tertentu
const getContact = (contacts, name) => {
    //periksa apakah kontaknya masih kosong atau udah isi
    if (contacts.length === 0) {
        console.log("No contacts!");//kedepannya ini mungkin diganti jadi throw
        return false;
    }

    //cari kontak dengan nama === name
    const found = contacts.find(contact => {//reference ke objek contact dengan [name] tertentu
        return contact.name.toLowerCase() === name.toLowerCase();
    })
    return found;
}

//fungsi untuk memperbarui kontak
const updateContact = (contacts, contactData) => {
    const oldContact = getContact(contacts, contactData.oldName);
    if (!oldContact) {//jika kontak yang akan dihapus tidak ditemukan
        console.log("Contact not found!");//tampilkan pesan kesalahan
        throw {
            'value': contactData.oldName,
            'msg': 'Contact not found!',
            'param': 'name',
            'location': 'function'
        };
    } else {
        if (contactData.newName) {//jika pengguna memasukkan nama baru, maka perbarui nama nya
            oldContact.name = contactData.newName;
        }

        if (contactData.newMobile) {//jika pengguna memasukkan nomor mobile baru, maka perbarui nomor mobile nya
            oldContact.mobile = contactData.newMobile;
        }

        if (contactData.newEmail) {//jika pengguna memasukkan nomor email baru, maka perbarui email nya
            oldContact.email = contactData.newEmail;
        }

        saveContact(contacts);
        return true;
    }
}

//fungsi untuk menghapus kontak
const deleteContact = (contacts, name) => {//baca seluruh kontak yang tersimpan di file contacts.json
    const found = getContact(contacts, name);//cari kontak yang ingin dihapus
    console.log(name);
    if (!found) {//jika kontak yang akan dihapus tidak ditemukan
        throw console.log("Contact not found!");//bisa ganti jadi throw.
    } else {//sebaliknya...
        contacts = contacts.filter(contact => {//delete dari daftar kontak
            return contact.name.toLowerCase() != name.toLowerCase();
        });
        fs.writeFileSync(dataPath, '[]');//kosongkan file contacts.json dengan cara menimpa isinya dengan array kosong
    }

    fs.writeFileSync(dataPath, JSON.stringify(contacts));//tulis data kontak yang baru ke dalam berkas .json
    console.log(`Contact ${name} has been deleted!`);//kirimkan pesan konfirmasi ke pengguna
    return true;
}

//route ke halaman contact
app.get('/contact', (req, res) => {
    let successMessage = "";
    const contacts = loadContact();
    const errorMessages = [];
    // console.log(contacts);
    // loadContactAsync().then(contacts=>console.log(contacts));
    res.render(__dirname + '/views/contact.ejs', { contacts, successMessage, errorMessages });
})

//route yang dipanggil ketika menambahkan kontak baru
//POST tidak mengirimkan parameter melalui URL!!

//validator untuk menambahkan kontak baru
const addContactValidator = [
    //value itu value saat ini
    body("name").custom((value, { req }) => {
        if (!value) {
            throw "Please enter a name";
        } else if (req.body.oldName && value === req.body.oldName) {
            throw "Please use a different name";
        } else if (isDuplicate(loadContact(), value)) {//cek duplikat
            throw "This name is already used";
        }
        return true;
    }),
    check("email", "E-mail not valid").isEmail(),
    check("mobile", "Invalid mobile phone format,please use Indonesian format").isMobilePhone(region)
]

//route untuk menambahkan kontak baru
//TODO: perbaiki nama route supaya REST
app.post('/addContact', addContactValidator, (req, res) => {
    let contacts = loadContact();
    let successMessage = "";

    //validasi parameter sebelum add contact
    const errorMessages = validationResult(req).array();

    //jika terdapat pesan kesalahan, tampilkan pesan kesalahan
    if (errorMessages.length > 0) {
        res.render(__dirname + '/views/contact.ejs', {contacts});
        return;
    }

    //jika tidak, lakukan penambahan
    const success = addContact(contacts, req.body);
    if (success) {
        successMessage = "Contact has been successfully added!";
        res.render(__dirname + '/views/contact.ejs', { contacts, successMessage, errorMessages });
    }
})

//validator untuk update kontak

//TODO: Kalau update nya gagal, kirim balik req.body nya
const updateContactValidator = [
    //value itu value saat ini
    body("newName").custom((value, { req }) => {
        if (!value) {
            return true;
        } else if (req.body.oldName && value === req.body.oldName) {
            throw "Please use a different name";
        } else if (isDuplicate(loadContact(), value)) {//cek duplikat
            throw "This name is already used";
        }
        return true;
    }),
    body("newEmail").custom((value, { req }) => {
        if (!value) {
            return true;
        } else if (!isEmail(value)) {
            throw "Invalid Email format!";
        }
        return true;
    }),
    //lakukan validasi jika dan hanya jika field 'mobile' nya diisi
    //kalo mobile nya kosong, yaudah gak usah divalidasi, artinya pengguna ga mau ngubah mobile nya.
    //https://stackoverflow.com/a/47086674
    check("newMobile", "Invalid mobile phone format, please use Indonesian format").optional().isMobilePhone(region)
]

//route untuk update kontak
//TODO: perbaiki nama route supaya REST
app.post('/updateContact', updateContactValidator, (req, res) => {
    //baca semua kontak
    let contacts = loadContact();
    //validasi input sebelum update kontak
    const errorMessages = validationResult(req).array();
    let successMessage = "";

    //jika terdapat kesalahan, tampilkan pesan kesalahan
    if (errorMessages.length > 0) {
        res.render(__dirname + '/views/contact.ejs', { contacts, successMessage, errorMessages });
        return;
    } else {
        //kalau tidak ada yang diisi, tampilkan error
        if (!req.body.newName && !req.body.newMobile && !req.body.newEmail) {
            errorMessages.push({
                'value': undefined,
                'msg': 'Please fill your new name or email or mobile!',
                'param': ['newName', 'newMobile', 'newEmail'],
                'location': 'function'
            })
            res.render(__dirname + '/views/contact.ejs', { contacts, successMessage, errorMessages });
            return;
        } else {
            const success = updateContact(contacts, req.body);
            if (success) {
                successMessage = "Contact has been successfully updated!"
            }
            res.render(__dirname + '/views/contact.ejs', { contacts, successMessage, errorMessages });
        }
    }
})

//TODO: modifikasi supaya loadContact() nya cuma sekali doang
//TODO: perbaiki nama route supaya REST
app.get('/deleteContact/', (req, res) => {
    //kueri nama perlu di=parse menggunakan module url karena karakter spasi diganti menjadi %20
    //penjelasan lengkap: https://stackoverflow.com/a/8590367
    const errorMessages = [];
    let successMessage = "";
    let contacts = loadContact();
    if (errorMessages.length > 0) {
        res.render(__dirname + '/views/contact.ejs', { contacts, successMessage, errorMessages });
        return;
    }

    //contacts nya belum di update...
    const success = deleteContact(contacts, url.parse(req.url, true).query.name);
    contacts = loadContact();
    if (success) {
        successMessage = "Contact has been deleted!"
    }
    res.render(__dirname + '/views/contact.ejs', { contacts, successMessage, errorMessages });
})

//middleware terletak di antara request pengguna dan response
app.use('/time',(req, res, next) => {
    console.log('Time:', Date.now())
    next()//kalo gak ada ini... bakal loading terus a.k.a left-hanging
    //cari middleware selanjutnya
  })

app.use('/about',(req,res,next)=>{
    res.render(__dirname+'/views/about.ejs');
})

//jika akses selain route selain yang disediakan diatas, tampilkan error 404
app.use('/', (req, res) => {//todo: cari cara buat nampilin html 404 not found.
    res.writeHead(404);//buat status code
    res.write('Error: page not found');
    res.end();
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
})