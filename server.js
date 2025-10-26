require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const mongoose = require('mongoose')
const cors = require('cors');
const multer = require('multer')
const app = express();
const fs = require('fs')

const path = require('path');

//app.use(express.static(path.join(__dirname, '../front-end')));

app.use(cors()); 
app.use(express.json())



mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("🟢 Conectado ao MongoDB Atlas"))
.catch((err) => console.error("🔴 Erro ao conectar ao MongoDB", err));



// Criação de places(sensores)

const PlacesData = require('./PlacesModel')

app.post('/send/places', async (req, res) => {
  const { id, name, desc, position, img } = req.body; 
  const parsedPosition = JSON.parse(position);   
  

  try {
    const sameId = await PlacesData.findOne({ id });
    const sameName = await PlacesData.findOne({ name });

    if (sameId || sameName) {
      return res.status(400).json({ message: 'Já existe um sensor com este ID ou nome.' });
    }
 
    const newPlace = new PlacesData({ id, name, desc, position: parsedPosition, img });
    await newPlace.save();
    console.log("Sensor criado:", name, id);
    res.status(200).send("Dados recebidos e salvos com sucesso!");
  } catch (error) {
    console.error("Erro ao criar sensor:", error);
    res.status(500).send("Erro ao salvar dados no banco");
  }
});

app.patch('/update/places', async (req, res) => {
  
  const { id, name, desc, position, img } = req.body; 
  const parsedPosition = JSON.parse(position);  
  const place = await PlacesData.findOne({ id }) 
  

  
  
try {
 await PlacesData.updateOne({ id },{ $set: {
  name: name,
  desc: desc,
  position: parsedPosition,
  img: img
 }})
 
 res.status(200).send("Sensor atualizado com sucesso!");
} catch(error) {
  console.error('Erro ao atualizar sensor', error)
  res.status(500).send("Erro ao atualizar sensor");
}
})


//delete place

app.delete('/delete/places/:id', async (req, res) => {
  const { id } = req.params

  const deleted = await PlacesData.deleteOne({ id })

   if (deleted.deletedCount === 0) {
      return res.status(404).send('Item não encontrado');
    }
   

} )

const SensorData = require('./sensorModel');
const mediaModel = require('./mediaModel');
const mediaDiariaModel = require('./mediaDiariaModel');
const PlacesModel = require('./PlacesModel');

//coleta das informações 

app.get('/send', async (req, res) => {
  const { temp, hum, ppm ,id } = req.query;

  try {
    const novoDado = new SensorData({ temp, hum, ppm ,id });
    await novoDado.save();

    console.log("Dados salvos:", temp, hum, ppm ,id);
    res.status(200).send("Dados recebidos e salvos com sucesso!");
    CriaMedia(id)
  } catch (error) {
    console.error("Erro ao salvar dados:", error);
    res.status(500).send("Erro ao salvar dados no banco");
  }
});

//faz uma média dos dados a cada 6 horas

  async function CriaMedia(id) {
    
   const place = await PlacesData.findOne({ id })


   if (place.MediaCounter<72) {
   place.MediaCounter+=1
   await place.save()
   console.log('aumentando contador para',place.MediaCounter, id)
   } 

   else if (place.MediaCounter === 72) {
     const sixdates = await SensorData.find({ id:id }).sort({ timestamp: -1 }).limit(72);
     const mediatemp = (sixdates.reduce((acc, obj) => acc + Number(obj.temp), 0)/72).toFixed(1)
     const mediahum = (sixdates.reduce((acc, obj) => acc + Number(obj.hum), 0)/72).toFixed(1)
     const mediappm = (sixdates.reduce((acc, obj) => acc + Number(obj.ppm), 0)/72).toFixed(1)
     
     const novoDadomedia = new mediaModel({ mediatemp, mediahum, mediappm ,id });
    await novoDadomedia.save();

    place.MediaCounter = 0
    await place.save()
    await Criamediadiaria(id)
   }
};

async function Criamediadiaria(id) {
  const place = await PlacesData.findOne({ id })

  if (place.dailyMediaCounter < 4) {
    place.dailyMediaCounter += 1;
    await place.save();
  } else if (place.dailyMediaCounter === 4) {
    const fourdates = await mediaModel.find({ id }).sort({ timestamp: -1 }).limit(4);

    const mediatempdiaria = (fourdates.reduce((acc, obj) => acc + Number(obj.mediatemp), 0) / 4).toFixed(1);
    const mediahumdiaria = (fourdates.reduce((acc, obj) => acc + Number(obj.mediahum), 0) / 4).toFixed(1);
    const mediapmmdiaria = (fourdates.reduce((acc, obj) => acc + Number(obj.mediapmm), 0) / 4).toFixed(1);

    const novoDadomediaDiaria = new mediaDiariaModel({ mediatempdiaria, mediahumdiaria, mediapmmdiaria, id });
    await novoDadomediaDiaria.save();

    place.dailyMediaCounter = 0;
    await place.save();
  }
}




//get para enviar os dados para o front
app.get('/api/atual/:id', async (req, res) => {

  const sensorId = req.params.id

  const ultimoDado = await SensorData.findOne({ id:sensorId }).sort({ timestamp: -1 });

  if (!ultimoDado) {
    // Se não tem dado nenhum, retorna um padrão, ou mensagem de erro
    return res.json({ temp: null, hum: null, message: "Nenhum dado encontrado" });
  }

  const atuais = [
    { temp: ultimoDado.temp, hum: ultimoDado.hum, ppm: ultimoDado.ppm  }
  ];
  
  res.json(atuais);
});

//API para places

app.get('/api/places', async (req, res) => {
  const places = await PlacesData.find()

  if(!places) {
    console.log("nenhum sensor encontrado")
  }

  res.json(places)
}) 


//get para enviar os dados médios para gráficos do front 

app.get('/api/mediasweek/:id', async (req, res) => {

  const sensorId = req.params.id

  const ultimasMedias = await mediaModel.find({ id:sensorId }).sort({ timestamp: 1 }).limit(28);

  if (!ultimasMedias || ultimasMedias.length === 0) {
    return res.json([]);
  }

  res.json(ultimasMedias); // manda tudo direto
});

//get para obter dados médios mensais

app.get('/api/mediasmonth/:id', async (req, res) => {

 const sensorId = req.params.id

  const ultimasMediasmensais = await mediaDiariaModel.find({ id:sensorId }).sort({ timestamp: 1 }).limit(30);

  if (!ultimasMediasmensais || ultimasMediasmensais.length === 0) {
    return res.json([]);
  }

  res.json(ultimasMediasmensais); // manda tudo direto
});

//webhook




  

  

    



//resposta do webhook

app.post('/webhook-resposta', (req, res) => {
  const { local, mensagemGerada } = req.body;

  console.log(`Recebi avaliação do local ${local}:`);
  console.log(mensagemGerada);

  
  res.sendStatus(200); 
});


// Quando o servidor estiver "pronto"
app.on('pronto', () => {
  const port = process.env.PORT || 3000; // Usando variável de ambiente
  app.listen(port, () => {
    console.log(`Acessar http://localhost:${port}`);
    console.log(`Servidor executando na porta ${port}`);
  });
});

// Emitindo o evento "pronto" quando o servidor estiver configurado
app.emit('pronto');
