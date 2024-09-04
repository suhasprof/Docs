const mongoose = require("mongoose");
const Document = require("./Doc");

// Use environment variable for MongoDB URI or fallback to local
mongoose.connect(process.env.MONGO || 'mongodb://localhost:27017/Google-docs-Clone', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

const defaultValue = "";

// Initialize Socket.IO server
const io = require("socket.io")(3001, {
  cors: {
    origin: "https://docs-frontend-one.vercel.app", // Replace with your frontend URL
    methods: ["GET", "POST"],
  },
});

// Handle Socket.IO connections
io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("get-document", async (documentID) => {
    try {
      const document = await findOrCreateDocument(documentID);
      socket.join(documentID); // Join the room
      socket.emit("load-document", document.data);

      socket.on("send-changes", (delta) => {
        socket.broadcast.to(documentID).emit("receive-changes", delta);
      });

      socket.on("save-document", async (data) => {
        try {
          await Document.findByIdAndUpdate(documentID, { data });
        } catch (error) {
          console.error('Error saving document:', error);
        }
      });
    } catch (error) {
      console.error('Error getting document:', error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Function to find or create a document
async function findOrCreateDocument(id) {
  if (!id) return null;
  let document = await Document.findById(id);
  if (document) return document;
  document = await Document.create({ _id: id, data: defaultValue });
  return document;
}
