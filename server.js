require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const mongoose = require('mongoose')
const cors = require('cors');
const multer = require('multer')
const app = express();


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
  

  try {
    const sameId = await PlacesData.findOne({ id });
    const sameName = await PlacesData.findOne({ name });

    if (sameId || sameName) {
      return res.status(400).json({ message: 'Já existe um sensor com este ID ou nome.' });
    }
 
    const newPlace = new PlacesData({ id, name, desc, position, img });
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




  

  

    




app.post('/analyse', async (req, res) => {
  const { temp, hum, ppm, desc } = req.body;

  try {
    const agentRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-8b-instruct:free",
        messages: [
          {
            role: "system",
            content: `Você é um especialista em qualidade do ar. Retorne somente um JSON válido com a estrutura:
{
  "titulo": "...",
  "explicacao": "...",
  "causas": ["...","...","..."],
  "impacto": ["...","...","..."],
  "solucoes": ["...","...","..."],
  "mensagem": "...",
  "cor": "verde|amarelo|laranja|vermelho"
}
obs: cada item das listas deve ter no máximo 5 palavras.

Dados recebidos:
- Temperatura: ${temp}°C
- Umidade: ${hum}%
- CO₂: ${ppm} ppm
- Descrição do local: ${desc}

Analise todos os fatores juntos e gere uma avaliação completa, consistente e acionável. Retorne somente o JSON, sem texto extra.`
          }
        ]
      })
    });

    const data = await agentRes.json();
    const content = data.choices[0].message.content;

    let json;
    try {
      json = JSON.parse(content);
    } catch (e) {
      console.error("Erro ao parsear JSON:", e);
      json = { erro: "Modelo retornou JSON inválido", raw: content };
    }

    res.json(json);

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: "Falha ao gerar avaliação" });
  }
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
