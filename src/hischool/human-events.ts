export enum HumanEvent {
  LANG,
  CHAT,
  HAT,
  WALKING,
  SAW_TROLL,
  ACQUIRE_SUPER_JUMP,
  ACQUIRE_SUPER_STRENGTH,
  SUPER_JUMP,
  FLY,
  DROP_DOWN,
  MEET_ANOTHER_HUMAN,
  SAW_FLYING_HUMAN, //  not yet implemented
  SAW_SNAIL,
  PUSHED_ROCK,
  SAW_CAT,
  GOLD_CITY,
  STRANGE_WRITING,
  SHRUNK,
  EXPAND,
  PIZZA,
  WEIRD_GREEN_SLIMY_CREATURE,
  DRUNK_YELLOW_CREATURE,
  ACQUIRE_FREEZE,
  FREEZE, //  not yet implemented
  LOW_BATTERY,
  NORMAL_BATTERY,
  FOUND_KEY,
  FOUND_DOOR_CLOSED,
  FOUND_DOOR_OPENED,
  BLUE,
  SWIM,
  MATH_WIZ,
  MASTER_CHEF,
  NOSHIT,
  UPSIDE_DOWN,
  NOT_UPSIDE_DOWN,
  BURBERRY_MAN,
  WEATHER_MAN,
  INSECT_MAN,
  TELEPORT,
  HELL,
  RED_VELVET,
  INVISIBLE_MAN,
  BIB,
  GOLD_CHAIN,
  SCARF,
  HEADPHONES,
  BUNNY_EAR,
  FLOWER,
  RETRO_SHUTTER_SHADES,
  EYE_PATCH,
  GLASSES,
  VR_HEADSET,
};



export const DICO: Record<HumanEvent, string> = {
  [HumanEvent.LANG]: "The human's native language is <nativeLang>. All replies from this human must mix some words from the native language and words from the following language: <lang>",
  [HumanEvent.HAT]: "The human is wearing a hat.",
  [HumanEvent.WALKING]: "The human is walking back and forth on a platform.",
  [HumanEvent.SAW_TROLL]: "The human thinks they saw a troll passing by, but the troll disappeared.",
  [HumanEvent.ACQUIRE_SUPER_JUMP]: "The human just acquired the power of super jump, but doesn't know it yet. They just feel weird.",
  [HumanEvent.ACQUIRE_SUPER_STRENGTH]: "The human just acquired the power of super strength, but doesn't know it yet. They feel stronger.",
  [HumanEvent.SUPER_JUMP]: "The human makes a giant leap, using the power of super jump.",
  [HumanEvent.FLY]: "The human starts to levitate a few meters in the air, and now floats around.",
  [HumanEvent.DROP_DOWN]: "The human just lost the ability to fly and just falls down.",
  [HumanEvent.MEET_ANOTHER_HUMAN]: "The human meets another human, and greets the other person.",
  [HumanEvent.SAW_SNAIL]: "The human saw a snail, doesn't want to get too close.",
  [HumanEvent.PUSHED_ROCK]: "The human pushes a heavy rock, and realizes they have super strength.",
  [HumanEvent.SAW_CAT]: "The human sees a cat, doesn't want to get close.",
  [HumanEvent.GOLD_CITY]: "The human is walking around a mysterious place where floors, walls and ceiling are covered with solid gold.",
  [HumanEvent.STRANGE_WRITING]: "The human sees strange writing on the wall.",
  [HumanEvent.SHRUNK]: "The human shrunk down the size of a small rat. Everything around looks so big.",
  [HumanEvent.EXPAND]: "The human's size is restored from small back to normal.",
  [HumanEvent.PIZZA]: "The human is walking around a trippy place where floors, walls and ceiling are made of pizza.",
  [HumanEvent.WEIRD_GREEN_SLIMY_CREATURE]: "The human sees a green slimy creature, doesn't like to get close.",
  [HumanEvent.DRUNK_YELLOW_CREATURE]: "The human sees a weird drunk yellow creature, doesn't like to get close.",
  [HumanEvent.ACQUIRE_FREEZE]: "The human acquire the power to freeze but doesn't know it yet. Feels a little chill.",
  [HumanEvent.FREEZE]: "The human accidentally uses its supernatural power to freeze on another human, completely freezing that person.",
  [HumanEvent.CHAT]: "The human just had an inner monologue.",
  [HumanEvent.LOW_BATTERY]: "The human notices that the game they're in is slow, because the laptop where the game is running on is low on battery. The human advice to plug in the power cord.",
  [HumanEvent.NORMAL_BATTERY]: "The human notices that the framerate of the game they're in is now back to normal.",
  [HumanEvent.FOUND_KEY]: "The human finds a key, but is not sure where it fits.",
  [HumanEvent.FOUND_DOOR_CLOSED]: "The human finds a door that is closed, and doesn't know what's on the other side.",
  [HumanEvent.FOUND_DOOR_OPENED]: "The human finds a door that is opened, leading to a new world.",
  [HumanEvent.BLUE]: "The human's skin turned completely blue.",
  [HumanEvent.SWIM]: "The human accidentally fell into the water and is now swimming.",
  [HumanEvent.MATH_WIZ]: "The human acquired the useless power to recite all digits of PI indefinitely.",
  [HumanEvent.MASTER_CHEF]: "The human acquired the useless power to cook delicious meal with snails.",
  [HumanEvent.NOSHIT]: "The human acquired the useless power to go several months without the need to go to the toilet.",
  [HumanEvent.UPSIDE_DOWN]: "The human is now upside down, walking feet on the ceiling. They see the whole world upside down.",
  [HumanEvent.NOT_UPSIDE_DOWN]: "The human is no longer upside down, feet on the ceiling. Gravity is restored back to normal.",
  [HumanEvent.BURBERRY_MAN]: "The human's clothes instantly disappear. The human is now in their underwear.",
  [HumanEvent.WEATHER_MAN]: "The human acquired the useless power to predict the weather exactly one year from now.",
  [HumanEvent.INSECT_MAN]: "The human acquired the useless power to read the mind of an insect.",
  [HumanEvent.TELEPORT]: "The human just instantly teleported to another location, along with all their clothes.",
  [HumanEvent.HELL]: "The human is walking around a scary looking place they looks like hell, with rocky red walls and intense heat.",
  [HumanEvent.RED_VELVET]: "The human is walking around a strangely deliciously looking place, where the walls look like red velvet cake with icing on top.",
  [HumanEvent.INVISIBLE_MAN]: "The human's body is invisible, but their clothes they are wearing are still visible.",
  [HumanEvent.SAW_FLYING_HUMAN]: "The human saw another human flying around.",
  [HumanEvent.BIB]: "The human is wearing a bib.",
  [HumanEvent.GOLD_CHAIN]: "The human is wearing a gold chain.",
  [HumanEvent.SCARF]: "The human is wearing a scarf.",
  [HumanEvent.HEADPHONES]: "The human is wearing earmuffs.",
  [HumanEvent.BUNNY_EAR]: "The human is wearing bunny ear.",
  [HumanEvent.FLOWER]: "The human is wearing a flower on their head.",
  [HumanEvent.RETRO_SHUTTER_SHADES]: "The human is wearing retro shutter shades.",
  [HumanEvent.EYE_PATCH]: "The human is wearing a black eye patch like a pirate.",
  [HumanEvent.GLASSES]: "The human is wearing glasses.",
  [HumanEvent.VR_HEADSET]: "The human is wearing a VR headset."
}
