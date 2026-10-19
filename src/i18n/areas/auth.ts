const en = {
  shellText: "Lessons, videos and quizzes from your teachers, in one place.",
  email: "Email",
  password: "Password",
  fullName: "Full name",
  network: "Could not reach the server. Check your connection and try again.",
  show: "Show",
  hide: "Hide",
  showLabel: "Show password",
  hideLabel: "Hide password",
  login: {
    heading: "Log in",
    intro: "Welcome back. Pick up your lessons where you left off.",
    submit: "Log in",
    pending: "Logging in...",
    error:
      "The email or password is not correct. After 5 failed attempts you will need to wait 15 minutes.",
    newHere: "New here?",
    createAccount: "Create an account",
  },
  signup: {
    heading: "Create an account",
    intro:
      "New accounts are student accounts. If you teach here, ask an administrator to change your role after you sign up.",
    passwordHint: "At least 8 characters.",
    submit: "Create account",
    pending: "Creating your account...",
    haveAccount: "Already have an account?",
    login: "Log in",
  },
  api: {
    required: "Name, email, and password are required.",
    nameTooLong: "Name is too long.",
    emailInvalid: "Please enter a valid email address.",
    passwordShort: "Password must be at least 8 characters.",
    passwordLong: "Password must be 72 characters or fewer.",
    emailTaken: "A user with this email already exists.",
    generic: "Something went wrong. Please try again.",
  },
};

const am: typeof en = {
  shellText: "ከመምህራንዎ የሚመጡ ትምህርቶች፣ ቪዲዮዎችና ፈተናዎች በአንድ ቦታ።",
  email: "ኢሜይል",
  password: "የይለፍ ቃል",
  fullName: "ሙሉ ስም",
  network: "አገልጋዩን ማግኘት አልተቻለም። ግንኙነትዎን ይፈትሹና እንደገና ይሞክሩ።",
  show: "አሳይ",
  hide: "ደብቅ",
  showLabel: "የይለፍ ቃሉን አሳይ",
  hideLabel: "የይለፍ ቃሉን ደብቅ",
  login: {
    heading: "ይግቡ",
    intro: "እንኳን በደህና ተመለሱ። ትምህርትዎን ካቆሙበት ይቀጥሉ።",
    submit: "ይግቡ",
    pending: "በመግባት ላይ...",
    error: "ኢሜይሉ ወይም የይለፍ ቃሉ ትክክል አይደለም። 5 ጊዜ ከተሳሳቱ 15 ደቂቃ መጠበቅ ይኖርብዎታል።",
    newHere: "አዲስ ነዎት?",
    createAccount: "መለያ ይፍጠሩ",
  },
  signup: {
    heading: "መለያ ይፍጠሩ",
    intro:
      "አዲስ መለያዎች የተማሪ መለያዎች ናቸው። እዚህ የሚያስተምሩ ከሆነ ከተመዘገቡ በኋላ ሚናዎን እንዲቀይርልዎ አስተዳዳሪውን ይጠይቁ።",
    passwordHint: "ቢያንስ 8 ቁምፊዎች።",
    submit: "መለያ ይፍጠሩ",
    pending: "መለያዎን በመፍጠር ላይ...",
    haveAccount: "መለያ አለዎት?",
    login: "ይግቡ",
  },
  api: {
    required: "ስም፣ ኢሜይልና የይለፍ ቃል ያስፈልጋሉ።",
    nameTooLong: "ስሙ በጣም ረጅም ነው።",
    emailInvalid: "እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ።",
    passwordShort: "የይለፍ ቃሉ ቢያንስ 8 ቁምፊዎች መሆን አለበት።",
    passwordLong: "የይለፍ ቃሉ ከ72 ቁምፊዎች መብለጥ የለበትም።",
    emailTaken: "በዚህ ኢሜይል የተመዘገበ ተጠቃሚ አለ።",
    generic: "ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።",
  },
};

export const auth = { en, am };
