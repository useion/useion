package view;
import java.awt.Color;
import java.awt.Font;
import java.awt.image.BufferedImage;
import java.io.IOException;
import java.io.InputStream;
import javax.imageio.ImageIO;
import javax.swing.DefaultComboBoxModel;
import javax.swing.ImageIcon;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JLayeredPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSpinner;
import javax.swing.JTextArea;
import javax.swing.JTextField;

import controller.CenaPolozkyKeyAdapter;
import controller.CenaSurovinyKeyAdapter;
import controller.DruhPolozkyActionListener;
import controller.DruhSurovinyActionListener;
import controller.FormatActionListener;
import controller.HintMouseListener;
import controller.InsertPolozkaActionListener;
import controller.InsertSurovinaActionListener;
import controller.MnozstvoPoloziekKeyAdapter;
import controller.MnozstvoSurovinyKeyAdapter;
import controller.RestoreListener;
import parser.ResourceLoader;

public


class MainProgramWindow {

    public JLabel druhSurovinyLabel;
    public JLabel poddruhSurovinyLabel;
    public JLabel cenaSurovinyLabel;
    public JLabel mnozstvoSurovinLabel;
    public JLabel label5;
    public JLabel datumNakupuLabel;
    public JLabel acc;
    public JLabel druhPolozkyLabel;
    public JLabel poddruhPolozkyLabel;
    public JLabel cenaPolozkyLabel;
    public JLabel mnozstvoPoloziekLabel;
    public JLabel label11;
    public JLabel datumPredajaLabel;
    public JLabel copyright;

    public static JComboBox<String> druhPolozkyCombobox = new JComboBox<String>();
    public static JComboBox<String> poddruhPolozkyCombobox = new JComboBox<String>();
    public static JComboBox<String> jednotkaPolozkyCombobox = new JComboBox<String>();
    public static JComboBox<String> denPredajaCombobox = new JComboBox<String>();
    public static JComboBox<String> mesiacNakupu = new JComboBox<String>();
    public static JComboBox<String> mesiacPredajaCombobox = new JComboBox<String>();
    public static JComboBox<String> druhSurovinyCombobox = new JComboBox<String>();
    public static JComboBox<String> poddruhSurovinyCombobox = new JComboBox<String>();
    public static JComboBox<String> jednotkaMnozstvaSuroviny = new JComboBox<String>();
    public static JComboBox<String> denNakupuCombobox = new JComboBox<String>();

    public static JTextField cenaSurovinyField = new JTextField();
    public static JTextField mnozstvoSurovinyField = new JTextField();
    public static JTextField cenaPolozky = new JTextField();
    public static JTextField mnozstvoPoloziek = new JTextField();

    public static JButton insertSurovina = new JButton("Prida? >>");
    public static JButton insertPolozka = new JButton("<< Prida?");
    public static JButton removeSurovina = new JButton("<< Odstr?ni?");
    public static JButton removePolozka = new JButton("Odstr?ni? >>");
    public static JSpinner rokNakupu = new JSpinner();
    public static JSpinner rokPredaja = new JSpinner();

    public static JTextArea textArea1 = new JTextArea();
    public static JTextArea textArea2 = new JTextArea();
    public static JTextArea textArea3 = new JTextArea();
    public static JTextArea textArea4 = new JTextArea();
    public static JTextArea textArea5 = new JTextArea();
    public static JTextArea textArea6 = new JTextArea();
    public static JTextArea textArea7 = new JTextArea();
    public static JTextArea textArea8 = new JTextArea();

    public static JTextField nakladyVypis = new JTextField("0.00 ?");
    public static JTextField prijemVypis = new JTextField("0.00 ?");
    public static JTextField ziskVypis = new JTextField("0.00 ?");
    public static JLabel hint;
    public static InputStream cesta2;
    public static JLabel ziarovka;
    public static JLabel ziarovka2;
    public static int dotcnt = 0;
    public static int dotcnt2 = 0;
    public static int lineCNT = 0;
    public static JButton delete = new JButton("VYMAZA? DATAB?ZU");

    public ArrayList<Integer> myNumbers()    {
        ArrayList<Integer> numbers = new ArrayList<Integer>();
        numbers.add(5);
        numbers.add(11);
        numbers.add(3);
        return(numbers);
    }

    asdasdas () {

    }

    public


    MainProgramWindow(JLabel druhSurovinyLabel, JLabel poddruhSurovinyLabel, JLabel cenaSurovinyLabel, JLabel mnozstvoSurovinLabel, JLabel label5, JLabel datumNakupuLabel, JLabel acc, JLabel druhPolozky, JLabel poddruhPolozky, JLabel cenaPolozkyLabel, JLabel mnozstvoPoloziekLabel, JLabel label11, JLabel datumPredajaLabel, JLabel copyright){
        this.druhSurovinyLabel = druhSurovinyLabel;
        this.poddruhSurovinyLabel = poddruhSurovinyLabel;
        this.cenaSurovinyLabel = cenaSurovinyLabel;
        this.mnozstvoSurovinLabel = mnozstvoSurovinLabel;
        this.label5 = label5;
        this.datumNakupuLabel = datumNakupuLabel;
        this.acc = acc;
        this.druhPolozkyLabel = druhPolozky;
        this.poddruhPolozkyLabel = poddruhPolozky;
        this.cenaPolozkyLabel = cenaPolozkyLabel;
        this.mnozstvoPoloziekLabel  = mnozstvoPoloziekLabel;
        this.label11 = label11;
        this.datumPredajaLabel = datumPredajaLabel;
        this.copyright = copyright;
    }

    public MainProgramWindow() {
        // TODO Auto-generated constructor stub
    }

    public void MPW(JFrame window, Color xcolor) throws IOException{

        JLabel restore = new JLabel();
        JPanel bar = new JPanel();

        JScrollPane scroller1 = new JScrollPane();
        JScrollPane scroller2 = new JScrollPane();
        JScrollPane scroller3 = new JScrollPane();
        JScrollPane scroller4 = new JScrollPane();
        JScrollPane scroller5 = new JScrollPane();
        JScrollPane scroller6 = new JScrollPane();
        JScrollPane scroller7 = new JScrollPane();
        JScrollPane scroller8 = new JScrollPane();

        JLayeredPane JLP = new JLayeredPane();

        JPanel panel = new JPanel();

        String[] den = {"","01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31"};
        String[] mesiac = {"", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"};
        String[] produkt = {"", "<html><span style='color: blue'><font size='6'>PE?IVO</font></html>", "bageta", "chlieb", "ro?ok", "sendvi?", "?em?a", "-------------------------------------------------", "<html><span style='color: blue'><font size='6'>SLAN?</font></html>", "dalam?nka", "pag??", "pracl?k", "pos?ch", "ty?inky", "uzol", "-------------------------------------------------", "<html><span style='color: blue'><font size='6'>SLADK?</font></html>", "buchty/buchti?ky", "kol??e", "muffiny", "ro?ky","?i?ky", "ta?ti?ky", "viano?ka", "z?viny", "-------------------------------------------------", "<html><span style='color: blue'><font size='6'>VAREN?</font></html>", "kned?a", "-------------------------------------------------", "<html><span style='color: blue'><font size='6'>Ostatn?</font></html>", "str?hanka"};
        String[] surovina = {"", "cukor", "dro?die", "d?em", "hrozienka", "kakao", "koreniny", "mak", "m?so", "mlieko", "m?ka", "olej", "orechy", "semen?", "so?", "syr", "tvaroh", "tuky", "vajcia"};

        String[] jednotkyNakupu = {"", "baleniach", "kilogramoch", "kusoch", "litroch"};
        String[] jednotkyPredaja = {"", "baleniach", "kusoch"};

        JTextField field5 = new JTextField("d?tum");
        JTextField field6 = new JTextField("druh polo?ky");
        JTextField field7 = new JTextField("poddruh polo?ky");
        JTextField field8 = new JTextField("cena/j (?)");
        JTextField field9 = new JTextField("mno?stvo");
        JTextField field10 = new JTextField("editoval");
        JTextField field11 = new JTextField("cena (v ?)");

        JLabel nakup = new JLabel("<html><font size='30'><span style = 'color: rgb(174, 0, 0)'>N?KUP</font></html>");
        JLabel predaj = new JLabel("<html><font size='30'><span style = 'color: green'>PREDAJ</font></html>");
        JLabel naklady = new JLabel("<html><font size='30'><span style = 'color: rgb(174, 0, 0)'>N?KLADY</font></html>");
        JLabel prijem = new JLabel("<html><font size='30'><span style = 'color: green'>PR?JEM</font></html>");
        JLabel zisk = new JLabel("<html><font size='30'><span style = 'color: rgb(0, 0, 133)'>ZISK</font></html>");

        JLabel name = new JLabel("<html><b><span style='color: white'><font size='3'>??tovn?cky syst?m pre mal? pek?rne</font></b></html>");
        JPanel p1 = new JPanel();
        JPanel p2 = new JPanel();
        JPanel p3 = new JPanel();
        JPanel p4 = new JPanel();
        JPanel p5 = new JPanel();
        JPanel p6 = new JPanel();
        JPanel p7 = new JPanel();
        JPanel p8 = new JPanel();
        JPanel p9 = new JPanel();
        JPanel p10 = new JPanel();
        JPanel p11 = new JPanel();
        JPanel p12 = new JPanel();
        JPanel p13 = new JPanel();
        JPanel p14 = new JPanel();
        JPanel p15 = new JPanel();
        JPanel p16 = new JPanel();
        JPanel p17 = new JPanel();
        JPanel p18 = new JPanel();
        JPanel p19 = new JPanel();
        JPanel p20 = new JPanel();

        delete.setBounds(895, 65, 185, 25);
        delete.isOpaque();
        delete.setBackground(Color.RED);
        FormatActionListener FAL = new FormatActionListener();
        delete.addActionListener(FAL);

        InputStream path = ResourceLoader.load("restore_button.png");
        BufferedImage image;
        try {
            image = ImageIO.read(path);
            restore = new JLabel(new ImageIcon(image.getScaledInstance(30, 30, 30)));
            restore.setBounds(1302, 1, 30, 30);
            RestoreListener RL = new RestoreListener();
            restore.addMouseListener(RL);
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }

        InputStream cesta = ResourceLoader.load("white.png");
        BufferedImage img;
        try {
            img = ImageIO.read(cesta);
            ziarovka = new JLabel(new ImageIcon(img.getScaledInstance(50, 50, 50)));
            ziarovka.setBounds(220, 322, 50, 50);
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }

        InputStream cesta2 = ResourceLoader.load("blue.png");
        BufferedImage img2;
        try {
            img2 = ImageIO.read(cesta2);
            ziarovka2 = new JLabel(new ImageIcon(img2.getScaledInstance(50, 50, 50)));
            ziarovka2.setBounds(220, 322, 50, 50);
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }

        HintMouseListener BML = new HintMouseListener();
        ziarovka.addMouseListener(BML);
        ziarovka2.addMouseListener(BML);
        ziarovka2.setVisible(false);

        InputStream cesta1 = ResourceLoader.load("pecivo.jpg");
        BufferedImage img1;
        try {
            img1 = ImageIO.read(cesta1);
            JLabel pecivo = new JLabel(new ImageIcon(img1.getScaledInstance(20, 20, 20)));
            pecivo.setBounds(5, 5, 20, 20);
            window.add(pecivo);
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }

        InputStream cesta3 = ResourceLoader.load("hint.png");
        BufferedImage img3;
        try {
            img3 = ImageIO.read(cesta3);
            hint = new JLabel(new ImageIcon(img3.getScaledInstance(278, 275, 278)));
            hint.setBounds(0, 40, 278, 275);
            hint.requestFocusInWindow();
        } catch (IOException e) {
            // TODO Auto-generated catch block
            e.printStackTrace();
        }
        hint.setVisible(false);

        nakup.setBounds(60, 40, 200, 40);
        predaj.setBounds(1170, 40, 200, 40);
        naklady.setBounds(300, 655, 200, 40);
        prijem.setBounds(610, 655, 200, 40);
        zisk.setBounds(885, 655, 200, 40);
        p5.setBounds(0, 60, 50, 10);
        p5.isOpaque();
        p5.setBackground(Color.red);

        p6.setBounds(200, 60, 55, 10);
        p6.isOpaque();
        p6.setBackground(Color.red);

        p7.setBounds(1111, 60, 50, 10);
        p7.isOpaque();
        p7.setBackground(Color.green);

        p8.setBounds(1325, 60, 55, 10);
        p8.isOpaque();
        p8.setBackground(Color.green);

        p9.setBounds(480, 678, 100, 5);
        p9.isOpaque();
        p9.setBackground(Color.red);

        p10.setBounds(755, 678, 100, 5);
        p10.isOpaque();
        p10.setBackground(Color.green);

        p11.setBounds(980, 678, 100, 5);
        p11.isOpaque();
        p11.setBackground(Color.blue);

        p12.setBounds(575, 678, 5, 70);
        p12.isOpaque();
        p12.setBackground(Color.red);

        p13.setBounds(850, 678, 5, 70);
        p13.isOpaque();
        p13.setBackground(Color.green);

        p14.setBounds(1075, 678, 5, 70);
        p14.isOpaque();
        p14.setBackground(Color.blue);

        p15.setBounds(325, 748, 255, 5);
        p15.isOpaque();
        p15.setBackground(Color.red);

        p16.setBounds(635, 748, 220, 5);
        p16.isOpaque();
        p16.setBackground(Color.green);

        p17.setBounds(910, 748, 170, 5);
        p17.isOpaque();
        p17.setBackground(Color.blue);

        p18.setBounds(325, 700, 5, 50);
        p18.isOpaque();
        p18.setBackground(Color.red);

        p19.setBounds(635, 700, 5, 50);
        p19.isOpaque();
        p19.setBackground(Color.green);

        p20.setBounds(910, 700, 5, 50);
        p20.isOpaque();
        p20.setBackground(Color.blue);

        druhSurovinyLabel.setBounds(20, 90, 200, 40);
        druhSurovinyCombobox.setModel(new DefaultComboBoxModel<String>(surovina));
        druhSurovinyCombobox.setBounds(20, 120, 200, 30);
        DruhSurovinyActionListener DAL = new DruhSurovinyActionListener();
        druhSurovinyCombobox.addActionListener(DAL);

        poddruhSurovinyLabel.setBounds(20, 170, 200, 30);
        poddruhSurovinyCombobox.setBounds(20, 200, 200, 30);

        cenaSurovinyLabel.setBounds(20, 250, 200, 30);
        cenaSurovinyField.setBounds(20, 280, 200, 30);
        CenaSurovinyKeyAdapter CSKA = new CenaSurovinyKeyAdapter();
        cenaSurovinyField.addKeyListener(CSKA);
        JButton cenaSurovinyResetButton = new JButton("reset");
        cenaSurovinyResetButton.setBounds(145, 309, 74, 15);
        cenaSurovinyResetButton.addActionListener(action -> {cenaSurovinyField.setText("");
            dotcnt = 0;});

        CenaPolozkyKeyAdapter CPKA = new CenaPolozkyKeyAdapter();
        cenaPolozky.addKeyListener(CPKA);
        JButton cenaPolozkyResetButton = new JButton("reset");
        cenaPolozkyResetButton.setBounds(1271, 309, 74, 15);
        cenaPolozkyResetButton.addActionListener(action -> {cenaPolozky.setText("");
            dotcnt2 = 0;});

        mnozstvoSurovinLabel.setBounds(20, 330, 200, 30);
        mnozstvoSurovinyField.setBounds(20, 360, 80, 30);

        MnozstvoSurovinyKeyAdapter MSKA = new MnozstvoSurovinyKeyAdapter();
        mnozstvoSurovinyField.addKeyListener(MSKA);

        label5.setBounds(108, 360, 30, 30);
        jednotkaMnozstvaSuroviny.setModel(new DefaultComboBoxModel<String>(jednotkyNakupu));
        jednotkaMnozstvaSuroviny.setBounds(120, 360, 100, 30);

        datumNakupuLabel.setBounds(20, 400, 210, 30);
        denNakupuCombobox.setModel(new DefaultComboBoxModel<String>(den));
        denNakupuCombobox.setBounds(20, 440, 60, 30);

        mesiacNakupu.setModel(new DefaultComboBoxModel<String>(mesiac));
        mesiacNakupu.setBounds(90, 440, 60, 30);

        rokNakupu.setBounds(160, 440, 60, 30);

        insertSurovina.setBounds(20, 490, 200, 60);
        InsertSurovinaActionListener ISAL = new InsertSurovinaActionListener();
        insertSurovina.addActionListener(ISAL);

        InputStream path8 = ResourceLoader.load("exit_button.png");
        BufferedImage image8 = ImageIO.read(path8);
        JLabel label8 = new JLabel(new ImageIcon(image8.getScaledInstance(30, 30, 30)));
        label8.setBounds(1334, 1, 30, 30);
        ExitDialog ex = new ExitDialog();
        label8.addMouseListener(ex);

        name.setBounds(40, 5, 500, 20);

        bar.add(name);
        bar.add(restore);
        bar.add(label8);
        bar.setBounds(0, 0, 1366, 32);
        bar.setLayout(null);
        bar.isOpaque();
        bar.setBackground(Color.BLUE);
        bar.setVisible(true);

        textArea1.setBounds(2, 0, 84, 400);
        textArea2.setBounds(2, 0, 145, 400);
        textArea3.setBounds(2, 0, 205, 400);
        textArea4.setBounds(2, 0, 79, 400);
        textArea5.setBounds(2, 0, 102, 400);
        textArea7.setBounds(2, 0, 163, 400);
        textArea6.setBounds(2, 0, 73, 400);
        textArea8.setBounds(2, 0, 35, 400);

        textArea1.setEditable(false);
        textArea2.setEditable(false);
        textArea3.setEditable(false);
        textArea4.setEditable(false);
        textArea5.setEditable(false);
        textArea6.setEditable(false);
        textArea7.setEditable(false);
        textArea8.setEditable(false);

        panel.setBounds(290, 130, 790, 505);
        panel.setLayout(null);

        scroller8.setViewportView(textArea8);  //poradie
        scroller8.setBounds(0, 0, 35, 505);
        scroller1.setViewportView(textArea1);  //datum
        scroller1.setBounds(35, 0, 84, 505);
        scroller2.setViewportView(textArea2);  //nazov
        scroller2.setBounds(117, 0, 145, 505);
        scroller3.setViewportView(textArea3);  //druh
        scroller3.setBounds(261, 0, 205, 505);
        scroller4.setViewportView(textArea4);  //cena zajednotku
        scroller4.setBounds(465, 0, 78, 505);
        scroller5.setViewportView(textArea7);  //mnozstvo
        scroller5.setBounds(541, 0, 102, 505);
        scroller7.setViewportView(textArea5);  //cena
        scroller7.setBounds(641, 0, 81, 505);
        scroller6.setViewportView(textArea6);  //editor
        scroller6.setBounds(720, 0, 71, 505);

        scroller1.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        scroller2.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        scroller3.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        scroller4.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        scroller5.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        scroller6.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        scroller7.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);
        scroller8.setHorizontalScrollBarPolicy(JScrollPane.HORIZONTAL_SCROLLBAR_NEVER);

        scroller1.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_NEVER);
        scroller2.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_NEVER);
        scroller3.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_NEVER);
        scroller4.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_NEVER);
        scroller5.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_NEVER);
        scroller7.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_NEVER);
        scroller8.setVerticalScrollBarPolicy(JScrollPane.VERTICAL_SCROLLBAR_NEVER);

        scroller1.getVerticalScrollBar().setModel(scroller6.getVerticalScrollBar().getModel());
        scroller2.getVerticalScrollBar().setModel(scroller6.getVerticalScrollBar().getModel());
        scroller3.getVerticalScrollBar().setModel(scroller6.getVerticalScrollBar().getModel());
        scroller4.getVerticalScrollBar().setModel(scroller6.getVerticalScrollBar().getModel());
        scroller5.getVerticalScrollBar().setModel(scroller6.getVerticalScrollBar().getModel());
        scroller7.getVerticalScrollBar().setModel(scroller6.getVerticalScrollBar().getModel());
        scroller8.getVerticalScrollBar().setModel(scroller6.getVerticalScrollBar().getModel());

        panel.add(scroller1);
        panel.add(scroller2);
        panel.add(scroller3);
        panel.add(scroller4);
        panel.add(scroller5);
        panel.add(scroller6);
        panel.add(scroller7);
        panel.add(scroller8);
        panel.setVisible(true);

        acc.setBounds(550, 50, 350, 35);

        copyright.setBounds(5, 748, 200, 20);

        p1.isOpaque();
        p1.setBounds(0, 650, 255, 10);
        p1.setBackground(Color.RED);

        p2.isOpaque();
        p2.setBounds(245, 60, 10, 600);
        p2.setBackground(Color.RED);

        p3.isOpaque();
        p3.setBounds(1111, 650, 255, 10);
        p3.setBackground(Color.GREEN);

        p4.isOpaque();
        p4.setBounds(1111, 60, 10, 600);
        p4.setBackground(Color.GREEN);

        druhPolozkyLabel.setBounds(1146, 90, 200, 30);

        druhPolozkyCombobox.setBounds(1146, 120, 200, 30);
        druhPolozkyCombobox.setModel(new DefaultComboBoxModel<String>(produkt));
        DruhPolozkyActionListener DPAL = new DruhPolozkyActionListener();
        druhPolozkyCombobox.addActionListener(DPAL);

        poddruhPolozkyLabel.setBounds(1146, 170, 200, 30);
        poddruhPolozkyCombobox.setBounds(1146, 200, 200, 30);

        cenaPolozkyLabel.setBounds(1146, 250, 200, 30);
        cenaPolozky.setBounds(1146, 280, 200, 30);

        mnozstvoPoloziek.setBounds(1146, 360, 80, 30);
        MnozstvoPoloziekKeyAdapter MPKA = new MnozstvoPoloziekKeyAdapter();
        mnozstvoPoloziek.addKeyListener(MPKA);

        mnozstvoPoloziekLabel.setBounds(1146, 330, 200, 30);

        label11.setBounds(1234, 360, 30, 30);
        jednotkaPolozkyCombobox.setModel(new DefaultComboBoxModel<String>(jednotkyPredaja));
        jednotkaPolozkyCombobox.setBounds(1251, 360, 95, 30);

        datumPredajaLabel.setBounds(65, 20, 210, 30);
        denPredajaCombobox.setModel(new DefaultComboBoxModel<String>(den));
        denPredajaCombobox.setBounds(65, 50, 60, 30);

        mesiacPredajaCombobox.setModel(new DefaultComboBoxModel<String>(mesiac));
        mesiacPredajaCombobox.setBounds(135, 50, 60, 30);

        rokPredaja.setBounds(205, 50, 60, 30);

        insertPolozka.setBounds(65, 100, 200, 60);
        InsertPolozkaActionListener IPAL = new InsertPolozkaActionListener();
        insertPolozka.addActionListener(IPAL);

        removeSurovina.setBounds(20, 570, 200, 60);
        removeSurovina.addActionListener(ae -> {RemoveItemDialog RID = new RemoveItemDialog(); //LAMBDA V?RAZ
            RID.removeItem();});
        removePolozka.setBounds(65, 180, 200, 60);
        removePolozka.addActionListener(ae -> {RemoveItemDialog RID = new RemoveItemDialog();	//LAMBDA V?RAZ
            RID.removeItem();});

        Font font1 = new Font("SansSerif", Font.BOLD, 15);
        Font font2 = new Font("SansSerif", Font.BOLD, 25);

        field5.setBounds(325, 100, 83, 30);
        field5.setFont(font1);
        field6.setBounds(405, 100, 146, 30);
        field7.setBounds(549, 100, 206, 30);
        field8.setBounds(753, 100, 79, 30);
        field9.setBounds(830, 100, 102, 30);
        field11.setBounds(930, 100, 81, 30);
        field10.setBounds(1010, 100, 70, 30);
        field6.setFont(font1);
        field7.setFont(font1);
        field8.setFont(font1);
        field9.setFont(font1);
        field10.setFont(font1);
        field11.setFont(font1);
        field5.setHorizontalAlignment(JTextField.CENTER);
        field6.setHorizontalAlignment(JTextField.CENTER);
        field7.setHorizontalAlignment(JTextField.CENTER);
        field8.setHorizontalAlignment(JTextField.CENTER);
        field9.setHorizontalAlignment(JTextField.CENTER);
        field10.setHorizontalAlignment(JTextField.CENTER);
        field11.setHorizontalAlignment(JTextField.CENTER);
        field5.setEditable(false);
        field6.setEditable(false);
        field7.setEditable(false);
        field8.setEditable(false);
        field9.setEditable(false);
        field10.setEditable(false);
        field11.setEditable(false);

        nakladyVypis.setBounds(340, 700, 225, 40);
        nakladyVypis.setHorizontalAlignment(JTextField.RIGHT);
        nakladyVypis.setFont(font2);
        nakladyVypis.setEditable(false);
        prijemVypis.setBounds(650, 700, 190, 40);
        prijemVypis.setHorizontalAlignment(JTextField.RIGHT);
        prijemVypis.setFont(font2);
        prijemVypis.setEditable(false);
        ziskVypis.setBounds(925, 700, 140, 40);
        ziskVypis.setHorizontalAlignment(JTextField.RIGHT);
        ziskVypis.setFont(font2);
        ziskVypis.setEditable(false);

        rokNakupu.setValue(2016);
        rokPredaja.setValue(2016);

        JLP.setBounds(1080, 390, 286, 378);
        JLP.add(datumPredajaLabel, new Integer(1));
        JLP.add(denPredajaCombobox, new Integer(2));
        JLP.add(insertPolozka, new Integer(3));
        JLP.add(removePolozka, new Integer(4));
        JLP.add(rokPredaja, new Integer(5));
        JLP.add(mesiacPredajaCombobox, new Integer(6));
        JLP.add(hint, new Integer(7));
        JLP.add(ziarovka, new Integer(8));
        JLP.add(ziarovka2, new Integer(8));

        window.add(cenaSurovinyResetButton);
        window.add(cenaPolozkyResetButton);
        window.add(delete);
        window.add(JLP);
        window.add(nakladyVypis);
        window.add(prijemVypis);
        window.add(ziskVypis);
        window.add(naklady);
        window.add(prijem);
        window.add(zisk);
        window.add(predaj);
        window.add(p5);
        window.add(p6);
        window.add(p7);
        window.add(p8);
        window.add(p9);
        window.add(p10);
        window.add(p11);
        window.add(p12);
        window.add(p13);
        window.add(p14);
        window.add(p15);
        window.add(p16);
        window.add(p17);
        window.add(p18);
        window.add(p19);
        window.add(p20);
        window.add(nakup);
        window.add(field5);
        window.add(field6);
        window.add(field7);
        window.add(field8);
        window.add(field9);
        window.add(field10);
        window.add(field11);
        window.add(removeSurovina);
        window.add(mesiacNakupu);
        window.add(rokNakupu);
        window.add(jednotkaPolozkyCombobox);
        window.add(label11);
        window.add(mnozstvoPoloziekLabel);
        window.add(mnozstvoPoloziek);
        window.add(cenaPolozky);
        window.add(cenaPolozkyLabel);
        window.add(poddruhPolozkyCombobox);
        window.add(poddruhPolozkyLabel);
        window.add(druhPolozkyLabel);
        window.add(druhPolozkyCombobox);
        window.add(p2);
        window.add(p1);
        window.add(p3);
        window.add(p4);
        window.add(acc);
        window.add(panel);
        window.add(insertSurovina);
        window.add(druhSurovinyCombobox);
        window.add(poddruhSurovinyCombobox);
        window.add(cenaSurovinyField);
        window.add(mnozstvoSurovinyField);
        window.add(jednotkaMnozstvaSuroviny);
        window.add(denNakupuCombobox);
        window.add(druhSurovinyLabel);
        window.add(poddruhSurovinyLabel);
        window.add(cenaSurovinyLabel);
        window.add(mnozstvoSurovinLabel);
        window.add(label5);
        window.add(datumNakupuLabel);
        window.add(bar);
        window.add(copyright);
        window.setLayout(null);
        window.setSize(1366, 768);
        window.setLocationRelativeTo(null);
        window.setBackground(xcolor);
        window.setUndecorated(true);
        window.getContentPane().setBackground(xcolor);
        window.setVisible(true);
    }
}
