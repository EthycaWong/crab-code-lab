export const SERVO_SKETCH='#include <Arduino.h>\n#include <Servo.h>\nServo arm;\nvoid setup() { arm.attach(9); }\nvoid loop() { arm.write(90); delay(1000); }\n';
export const LIBRARY_SMOKE=`#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <EEPROM.h>
#include <SoftwareSerial.h>
#include <Servo.h>
#include <Stepper.h>
#include <LiquidCrystal.h>
#include <DHT.h>
#include <Adafruit_NeoPixel.h>
#include <NewPing.h>
#include <Bounce2.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <AccelStepper.h>
Servo arm;
Stepper stepper(200,2,3,4,5);
LiquidCrystal display(12,11,5,4,3,2);
DHT sensor(7,DHT22);
Adafruit_NeoPixel pixels(1,6,NEO_GRB+NEO_KHZ800);
NewPing sonar(8,9,200);
Bounce2::Button button;
OneWire oneWire(10);
DallasTemperature temperatures(&oneWire);
AccelStepper motor(AccelStepper::DRIVER,2,3);
SoftwareSerial port(10,11);
void setup() {
 Wire.begin(); SPI.begin(); arm.attach(9); arm.write(90);
 stepper.setSpeed(10); display.begin(16,2); sensor.begin(); pixels.begin();
 button.attach(2,INPUT_PULLUP); temperatures.begin(); motor.setMaxSpeed(100);
 port.begin(9600); EEPROM.update(0,1);
}
void loop() { button.update(); motor.run(); }
`;
