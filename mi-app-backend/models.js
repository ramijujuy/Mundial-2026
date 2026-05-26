const mongoose = require('mongoose');

// User Schema
const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  championshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Championship',
    required: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Championship Schema
const ChampionshipSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isClosedForRegistration: {
    type: Boolean,
    default: false
  },
  isFinished: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Match Schema
const MatchSchema = new mongoose.Schema({
  championshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Championship',
    required: true
  },
  date: {
    type: String, // String to handle imported format safely
    required: true
  },
  time: {
    type: String,
    required: true
  },
  phase: {
    type: String, // Group, J1, J2, Octavos, etc.
    required: true,
    trim: true
  },
  localTeam: {
    type: String,
    required: true,
    trim: true
  },
  visitorTeam: {
    type: String,
    required: true,
    trim: true
  },
  realResult: {
    type: String,
    enum: ['L', 'E', 'V', null], // L = Local, E = Empate, V = Visitor
    default: null
  },
  scoreLocal: {
    type: Number,
    default: null
  },
  scoreVisitor: {
    type: Number,
    default: null
  }
});

// Forecast (Pronóstico) Schema
const ForecastSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  championshipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Championship',
    required: true
  },
  matches: [
    {
      matchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match',
        required: true
      },
      selection: {
        type: String,
        enum: ['L', 'E', 'V'], // Player prediction
        required: true
      }
    }
  ],
  isConfirmed: {
    type: Boolean,
    default: false
  },
  pointsObtained: {
    type: Number,
    default: 0
  },
  confirmedAt: {
    type: Date
  }
});

// Composite unique index to avoid multiple forecast sheets per user/championship
ForecastSchema.index({ userId: 1, championshipId: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);
const Championship = mongoose.model('Championship', ChampionshipSchema);
const Match = mongoose.model('Match', MatchSchema);
const Forecast = mongoose.model('Forecast', ForecastSchema);

module.exports = {
  User,
  Championship,
  Match,
  Forecast
};
