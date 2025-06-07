interface Printer {
    void print(String text);
}

// 2. Клас, що адаптується (не змінюється)
class OldPrinter {
    void printOldFormat(String text) {
        System.out.println("Old format: " + text);
    }
}

// 3. Адаптер
class PrinterAdapter implements Printer {
    private OldPrinter oldPrinter;

    public PrinterAdapter(OldPrinter oldPrinter) {
        this.oldPrinter = oldPrinter;
    }

    @Override
    public void print(String text) {
        oldPrinter.printOldFormat(text); // Делегування виклику
    }
}

// 4. Клієнт
class Client {
    private Printer printer;

    public Client(Printer printer) {
        this.printer = printer;
    }

    void printDocument(String text) {
        printer.print(text); // Робота через уніфікований інтерфейс
    }
}