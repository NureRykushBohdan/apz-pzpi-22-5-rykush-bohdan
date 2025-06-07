Adapter (Java)
interface Printer {
 void print(String text);
}
class OldPrinter {
 void printOldFormat(String text) {
 System.out.println("Old format: " + text);
 }
}
class PrinterAdapter implements Printer {
 private OldPrinter oldPrinter;
 public PrinterAdapter(OldPrinter oldPrinter) {
 this.oldPrinter = oldPrinter;
 }
}
 public void print(String text) {
 oldPrinter.printOldFormat(text);
 }
}
class Client {
 private Printer printer;
 public Client(Printer printer) {
 this.printer = printer;
 }
 void printDocument(String text) {
 printer.print(text);
 }
}