const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a87xhva.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const bookingCollection = client.db("parcel").collection("booking");
    const userCollection = client.db("parcel").collection("users");
    //jwt related api
    
    //middlewares
    // 1 user
    app.get('/users/:email', async (req, res) =>{
      const email =req.params.email
      const result = await userCollection.findOne({email});
      res.send(result);
    })

   //delete booking
   app.delete("/booking/:id", async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await bookingCollection.deleteOne(query);
    res.send(result);
  });
  // update booking
  app.put('/booking/:id', async(req, res) => {
    const id = req.params.id;
    const filter = {_id: new ObjectId(id)}
    const options = { upsert: true };
    const updateCraft = req.body;
    const craft = {
        $set: {
          type: updateCraft.type,
            deliveryDate: updateCraft.deliveryDate,
            bookingDate: updateCraft.bookingDate,
            
        }
    }
const result = await bookingCollection.updateOne(filter, craft, options);
res.send(result);
   
})


app.get('/booking/:id', async(req, res) =>{
  const id =req.params.id;
  const query = {_id: new ObjectId(id)}
  const result = await bookingCollection.findOne(query);
  res.send(result);
})



    app.post("/booking", async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });
    
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });
    // alluser
    app.get("/users", async (req, res) => {
      const cursor = userCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    // adin
    app.get('/users/admin/:email', async(req, res) =>{
     const email = req.params.email;
     if(email !== req.decoded.email){
      return res.status(403).send({message: 'unauthorized access'});
     }
     const query = {email: email};
     const user = await userCollection.findOne(query);
     let admin = false;
     if(user){
      admin = user?.role === 'admin';
     }
     res.send({admin});
    })
    
    // update admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });
    // update Delivery
    app.patch("/users/delivery/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "delivery",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    app.get("/booking", async (req, res) => {
      console.log(req.query.email);
      console.log(req.query);
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      console.log(query);
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    
    //payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const {price} = req.body;
      const amount = parseInt(price * 100);

      const paymentIntent = await stripe.paymentIntent.create({
        amount : amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("parcel is running");
});

app.listen(port, () => {
  console.log(`parcel server is running on port ${port}`);
});
