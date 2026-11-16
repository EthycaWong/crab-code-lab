export const BOARDS = [
  { id: 'uno', name: 'Arduino Uno', chip: 'ATmega328P', fqbn: 'arduino:avr:uno', flash: 32256, ram: 2048 },
  { id: 'nano', name: 'Arduino Nano', chip: 'ATmega328P', fqbn: 'arduino:avr:nano:cpu=atmega328', flash: 30720, ram: 2048 },
  { id: 'mega', name: 'Arduino Mega 2560', chip: 'ATmega2560', fqbn: 'arduino:avr:mega:cpu=atmega2560', flash: 253952, ram: 8192 },
];
export const STARTERS = [
  { id: 'blink', title: 'Blink', description: 'Make the built-in LED blink.', level: 'Start here', code: `#include <Arduino.h>\n\n// Blink the built-in LED.\n\nconst int ledPin = LED_BUILTIN;\nconst int blinkTime = 1000;  // milliseconds\n\nvoid setup() {\n  // Set the LED pin as an output.\n  pinMode(ledPin, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(ledPin, HIGH);  // LED on\n  delay(blinkTime);\n\n  digitalWrite(ledPin, LOW);   // LED off\n  delay(blinkTime);\n}\n` },
  { id: 'serial', title: 'Serial', description: 'Send a message over serial.', level: 'Serial', code: `#include <Arduino.h>\n\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  Serial.println("Hello from CRAB!");\n  delay(1000);\n}\n` },
  { id: 'analog', title: 'Analog input', description: 'Read an analog sensor on A0.', level: 'Sensors', code: `#include <Arduino.h>\n\nconst int sensorPin = A0;\n\nvoid setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int reading = analogRead(sensorPin);\n  Serial.println(reading);\n  delay(100);\n}\n` },
  { id: 'empty', title: 'Empty sketch', description: 'Start with a clean sketch.', level: 'Blank', code: `#include <Arduino.h>\n\nvoid setup() {\n  // Run once when the board starts.\n}\n\nvoid loop() {\n  // Repeated code goes here.\n}\n` },
  { id: 'servo', title: 'Servo Sweep', description: 'Move a servo using Servo.h.', level: 'Motors', code: `#include <Arduino.h>\n#include <Servo.h>\n\nServo arm;\n\nvoid setup() {\n  arm.attach(9);\n}\n\nvoid loop() {\n  for (int angle = 0; angle <= 180; angle++) {\n    arm.write(angle);\n    delay(15);\n  }\n  for (int angle = 180; angle >= 0; angle--) {\n    arm.write(angle);\n    delay(15);\n  }\n}\n` },
];
export type CompileResult = { success: boolean; output: string; diagnostics: {line:number;column:number;message:string;severity:'error'|'warning'}[]; flash?: number; ram?: number; duration?: number; ticket?: string; };
export type Sketch = { id:string; name:string; code:string; board:string; updated:number };
export const filename = (name:string) => (name.trim().replace(/[^a-zA-Z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,64) || 'crab_sketch') + '.cpp';
export function cppSource(code:string) { return /#\s*include\s*[<"]Arduino\.h[>"]/.test(code) ? code : '#include <Arduino.h>\n\n' + code; }
