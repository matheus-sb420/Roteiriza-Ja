require('dotenv').config({ quiet: true });

module.exports = {
  porta: Number(process.env.PORT) || 3000,
};
