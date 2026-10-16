#!/usr/bin/env python3
"""Generate a self-contained PDF for SCSR2043 Introduction 1 & 2."""
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.graphics.shapes import Drawing, Rect, Line, String, Polygon

ROOT=Path(__file__).resolve().parent
OUT=ROOT/"SCSR2043_Operating_Systems_Introduction_Study_Guide.pdf"
NAVY=HexColor("#16263B"); BLUE=HexColor("#1766A0"); PALE=HexColor("#EAF3F9")
GREY=HexColor("#526271"); LIGHT=HexColor("#DCE6ED")
W,H=A4
styles=getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitleOS",fontName="Helvetica-Bold",fontSize=27,leading=34,textColor=NAVY,spaceAfter=14))
styles.add(ParagraphStyle(name="SectionOS",fontName="Helvetica-Bold",fontSize=18,leading=23,textColor=NAVY,spaceBefore=15,spaceAfter=9,keepWithNext=True))
styles.add(ParagraphStyle(name="SubOS",fontName="Helvetica-Bold",fontSize=11.3,leading=16,textColor=BLUE,spaceBefore=12,spaceAfter=5,keepWithNext=True))
styles.add(ParagraphStyle(name="BodyOS",fontName="Helvetica",fontSize=9.5,leading=14.6,textColor=NAVY,spaceAfter=8))
styles.add(ParagraphStyle(name="SmallOS",fontName="Helvetica",fontSize=8.4,leading=12,textColor=GREY,spaceAfter=6))
styles.add(ParagraphStyle(name="CaptionOS",fontName="Helvetica-Oblique",fontSize=8.2,leading=11.7,textColor=GREY,spaceBefore=3,spaceAfter=12))
styles.add(ParagraphStyle(name="BulletOS",parent=styles["BodyOS"],leftIndent=15,firstLineIndent=-8,spaceAfter=5))
styles.add(ParagraphStyle(name="CellOS",fontName="Helvetica",fontSize=8.5,leading=12,textColor=NAVY))
styles.add(ParagraphStyle(name="CellHeadOS",fontName="Helvetica-Bold",fontSize=8.5,leading=12,textColor=white))
story=[]
def title(t): story.append(Paragraph(t,styles["SectionOS"]))
def sub(t): story.append(Paragraph(t,styles["SubOS"]))
def p(t): story.append(Paragraph(t,styles["BodyOS"]))
def b(*items):
    for s in items: story.append(Paragraph("&#8226;  "+s,styles["BulletOS"]))
def note(head,body):
    t=Table([[Paragraph("<b>"+head+"</b><br/>"+body,styles["BodyOS"])]],colWidths=[487])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),PALE),("LEFTPADDING",(0,0),(-1,-1),13),("RIGHTPADDING",(0,0),(-1,-1),13),("TOPPADDING",(0,0),(-1,-1),11),("BOTTOMPADDING",(0,0),(-1,-1),4)]))
    story.append(t); story.append(Spacer(1,10))
def grid(headers, rows, widths=None):
    data=[[Paragraph(x,styles["CellHeadOS"]) for x in headers]]+[[Paragraph(str(x),styles["CellOS"]) for x in row] for row in rows]
    t=Table(data,colWidths=widths or [487/len(headers)]*len(headers),repeatRows=1,hAlign="LEFT")
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),NAVY),("ROWBACKGROUNDS",(0,1),(-1,-1),[white,HexColor("#F3F7FA")]),("GRID",(0,0),(-1,-1),0.4,LIGHT),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
    story.append(t);story.append(Spacer(1,12))
def boxes(labels, caption, width=487):
    d=Drawing(width,92); gap=10; count=len(labels); bw=(width-gap*(count-1))/count
    for i,(a,c) in enumerate(labels):
        x=i*(bw+gap)
        d.add(Rect(x,24,bw,53,rx=6,ry=6,strokeColor=LIGHT,fillColor=PALE))
        d.add(String(x+bw/2,55,a,textAnchor="middle",fontSize=10,fontName="Helvetica-Bold",fillColor=NAVY))
        d.add(String(x+bw/2,38,c,textAnchor="middle",fontSize=7.5,fillColor=GREY))
        if i<count-1:
            mid=x+bw+gap/2;d.add(Line(mid-4,50,mid+4,50,strokeColor=BLUE,strokeWidth=1.4))
    story.append(d);story.append(Paragraph(caption,styles["CaptionOS"]))
def layers(labels,caption):
    d=Drawing(487,len(labels)*52+12)
    for j,(t,detail) in enumerate(labels):
        y=(len(labels)-j-1)*52+8
        d.add(Rect(48,y,391,42,rx=5,ry=5,strokeColor=LIGHT,fillColor=PALE if j%2==0 else white))
        d.add(String(244,y+26,t,textAnchor="middle",fontSize=10.5,fontName="Helvetica-Bold",fillColor=NAVY))
        d.add(String(244,y+11,detail,textAnchor="middle",fontSize=8.1,fillColor=GREY))
    story.append(d);story.append(Paragraph(caption,styles["CaptionOS"]))
def page(c,doc):
    c.saveState(); c.setStrokeColor(LIGHT);c.line(54,45,W-54,45)
    c.setFont("Helvetica",8);c.setFillColor(GREY)
    c.drawString(54,32,"SCSR2043  |  Operating Systems  |  Introduction 1 & 2")
    c.drawRightString(W-54,32,str(doc.page)); c.restoreState()
doc=SimpleDocTemplate(str(OUT),pagesize=A4,rightMargin=54,leftMargin=54,topMargin=48,bottomMargin=60,title="SCSR2043 Operating Systems: Introduction 1 and 2",author="Study guide")
# COVER
story.append(Spacer(1,48))
story.append(Paragraph("SCSR2043<br/>OPERATING SYSTEMS",styles["CoverTitleOS"]))
story.append(Paragraph("Introduction 1 &amp; 2 - Concept-first study guide",styles["SectionOS"]))
p("A connected explanation of the first two lecture introductions, based on the Week 1-2 materials. Covers the kernel, CPU, buses, registers, buffers, controllers, interrupts, RAM, processes, protection, OS structures, and computing environments.")
note("How to read", "Start with the big picture and the hardware section. Pause at each diagram and say out loud what each part does. The final worked example and practice questions test whether you can connect the concepts, rather than just recite definitions.")
layers([("USER AND APPLICATIONS","Browser, editor, music player"),("OPERATING SYSTEM","Kernel, services, drivers, system calls"),("HARDWARE","CPU, memory, SSD, keyboard, display")],"Figure 1. Apps ask for services; the OS coordinates hardware access.")
p("<b>Remember one sentence:</b> An operating system is software that manages computer resources and provides a safe way for programs to use them.")
story.append(PageBreak())
title("Roadmap: what the chapter is teaching")
p("These ideas form one story: the CPU executes instructions; programs share memory and devices; the operating system controls that sharing; hardware signals and privilege rules help the OS stay in control.")
grid(["Area","Questions to ask"],[
("OS and kernel","What work must be centralized? Why can't every app control hardware directly?"),
("CPU and connections","What are registers, buses, controllers, drivers, and buffers?"),
("Interrupts and I/O","How can devices finish work while the CPU does something else?"),
("Storage and memory","Where is data now? How is a cache different from a buffer?"),
("Execution and protection","How can many programs run? How does a system call reach the kernel?"),
("Systems and environments","How do cores, clusters, real-time systems, VMs and clouds differ?")
],[150,337])
sub("Learning method")
b("Read each section slowly, and cover the definitions before attempting the explanation in your own words.",
  "Draw the CPU-RAM-controller diagram from memory. Label the hardware and the software.",
  "Try the save-file walkthrough without looking. If it makes sense, most core terms will make sense too.")
note("A warning about analogies","They help you start, but they are not precise engineering definitions. For example, saying the kernel is a manager does not mean it is one physical chip or that it personally performs every instruction.")
title("1. What an operating system does")
p("The OS coordinates limited hardware resources. Many applications might need the CPU, RAM, network, storage, display, or speakers at the same time. The OS decides how they get these resources, separates one process from another, and provides common functions such as reading files.")
sub("User view versus system view")
grid(["User view","System view"],[("Open apps, save files, use the keyboard, hear audio, get a responsive computer.","Allocate CPU time and memory; handle devices; enforce permissions; recover from errors; keep programs isolated.")],[244,243])
sub("What exactly is the kernel?")
p("The <b>kernel</b> is the central, privileged part of the OS. It typically handles scheduling, memory management, interrupts, device control, and protection. It is software: CPU cores execute kernel instructions when kernel work is needed.")
p("The <b>whole operating system</b> usually includes much more than the kernel: system utilities, libraries, background services, drivers, and often user interfaces. Exact boundaries vary by design. A desktop app is not itself part of the kernel.")
note("Think about it","Your editor requests a file save. The editor knows the text, but the OS checks access and coordinates storage. The CPU executes whichever instructions are running, whether from the app or from the kernel.")
title("2. The CPU, registers, and the bus")
sub("CPU: the instruction executor")
p("The CPU runs machine instructions. Each core typically fetches an instruction, decodes what it means, performs the operation, and moves to the next one. A CPU with multiple cores can execute more than one instruction stream at the same time.")
boxes([("FETCH","Get instruction"),("DECODE","Interpret"),("EXECUTE","Perform work"),("CONTINUE","Next instruction")],"Figure 2. A simplified instruction cycle.")
sub("Registers: immediate working storage")
p("Registers are tiny, fast storage locations inside a CPU core. General-purpose registers can hold operands, addresses, and intermediate results. Specialized registers include the <b>program counter</b> (the instruction address to execute next) and <b>stack pointer</b> (tracks the current stack).")
p("For example, addition might load 7 and 5 into registers, add them, and hold 12 in a register. A later instruction might store that result in memory. This does not mean every calculation automatically writes to RAM immediately.")
sub("Bus or interconnect: a communication path")
p("A bus is a pathway for data and control information between computer components. Introductory descriptions distinguish <b>data</b> (what value), <b>address</b> (which location), and <b>control</b> (read/write and other signals). Modern hardware has multiple interconnect designs, so do not imagine one literal wire used for everything.")
boxes([("CPU","Registers / cores"),("RAM","Working memory"),("CONTROLLER","Device interface")],"Figure 3. Simplified communication across interconnects.")
title("3. Controllers, drivers, and buffers")
sub("Controller is hardware; driver is software")
p("A <b>device controller</b> is hardware or device electronics that accepts commands and reports status. A <b>device driver</b> is software that knows how to operate that controller. An I/O <b>device</b> is the hardware that sends or receives data, such as an SSD, keyboard, or network adapter.")
grid(["Term","Location","Role"],[
("Controller","Hardware","Accept commands; expose status; coordinate device activity."),
("Driver","Software","Send controller commands; manage completion and errors."),
("Device","Hardware or virtual","Produce or consume input/output data."),
("Bus / interconnect","Communication hardware","Move data, addresses, or control signals.")],[99,96,292])
sub("What is a buffer?")
p("A <b>buffer</b> is temporary storage used while data is moving, accumulating, or waiting to be processed. Buffers are often in RAM or on a controller. They are useful when a producer and consumer run at different speeds.")
p("Streaming video example: the network delivers data in bursts, but playback needs data continuously. A playback buffer holds some bytes in advance. During a short interruption, playback can continue using buffered data. If the interruption lasts too long, the buffer empties and playback stalls.")
note("Do not mix these up","A register is immediate CPU working storage. A buffer holds data in transit. A cache holds copies to avoid repeating slower accesses. RAM is general working memory. These words describe different roles; a buffer or cache may physically live in RAM.")
title("4. Interrupts and I/O operations")
sub("Why interrupts exist")
p("A program may request data from storage. If the CPU checked continuously whether the drive had finished, much CPU time could be wasted. An <b>interrupt</b> is a signal/event that can cause the CPU to pause its current execution, save enough state, and run an appropriate handler.")
p("Typical sequence: an I/O request begins; the CPU can run other ready work; the device reports completion; the CPU enters an interrupt handler; the OS records the result and makes waiting work runnable. In some designs, the system may poll instead of, or alongside, using interrupts.")
boxes([("REQUEST","Start device I/O"),("OTHER WORK","CPU runs tasks"),("INTERRUPT","Completion signal"),("RESUME","Continue task")],"Figure 4. One possible device I/O and completion flow.")
sub("Trap, exception, and system call")
p("An <b>exception</b> is associated with execution of an instruction, such as division by zero or an invalid memory access. A <b>system call</b> is a controlled way for a user program to request an OS service. A <b>hardware interrupt</b> commonly comes from a device or timer. Exact terminology and hardware mechanisms vary.")
sub("Direct Memory Access (DMA)")
p("DMA allows suitable controllers to move blocks of data to or from memory without having the CPU copy every byte in a tight loop. The CPU still sets up the transfer and the OS still manages memory, permissions, and completion. DMA is especially useful for larger I/O transfers.")
grid(["Method","Basic idea"],[("Busy waiting / polling","Repeatedly check whether an operation has finished. Appropriate in some low-latency designs; expensive if waiting for a long time."),("Interrupt-driven I/O","Let hardware signal when attention is needed. The CPU can do other work until then."),("DMA","Move blocks between memory and a capable device/controller with less CPU copying.")],[141,346])
title("5. RAM, storage, caches, and persistence")
p("The closer data is to the CPU's execution units, the faster it is often accessible, but the smaller and more expensive the storage tends to be. These are general tendencies, not universal rules.")
layers([("CPU REGISTERS","Tiny, fastest working values"),("CPU CACHE","Fast copies of selected data/instructions"),("RAM","Larger volatile working memory"),("SSD / HDD","Persistent storage for programs and files"),("ARCHIVE / BACKUP","Long-term or infrequently accessed storage")],"Figure 5. Conceptual memory and storage hierarchy.")
sub("Volatile vs nonvolatile")
p("<b>Volatile memory</b> generally loses its contents without power (ordinary RAM, registers, and caches). <b>Nonvolatile storage</b> generally keeps its contents without power (SSD, HDD, flash). Programs normally load code and active data from persistent storage into RAM for execution.")
sub("Cache hit, miss, and coherence")
p("A <b>cache hit</b> means requested data is found in the faster cache; a <b>miss</b> means the system must fetch it elsewhere. Multiple cores may hold copies of the same memory line. Hardware cache-coherence mechanisms help those cores agree about writes and visibility under the machine's memory model.")
p("The term <b>consistency</b> concerns which memory-operation orders software may observe. It is related to, but not identical with, cache coherence. A copy being coherent does not automatically mean every operation occurs in the simple order you imagined.")
note("Check yourself","When opening a saved photo, the SSD supplies persistent bytes, RAM holds active program data, CPU cache may hold recently accessed pieces, and registers hold immediate values for instructions.")
title("6. Computer-system organization")
sub("Single processor, multicore and multiprocessor")
p("A system may have one processor with one core, one processor with multiple cores, or several processor packages, each perhaps with multiple cores. Parallel processing means multiple execution units can perform work at the same instant.")
p("<b>Symmetric multiprocessing (SMP)</b> generally means multiple processors/cores have a broadly shared memory and OS arrangement. An OS must schedule work and coordinate concurrent access to shared state.")
sub("Clustered systems")
p("A <b>cluster</b> comprises separate computers (nodes) connected by a network and working together. Unlike cores in one CPU, cluster nodes are separate machines with their own memory and operating systems. Clustering can support performance, availability, or both, depending on design.")
grid(["Concept","What it describes"],[
("Multicore","Multiple processing cores within a processor/package."),
("Multiprocessor","Multiple processing units/packages sharing work in one system."),
("Cluster","Multiple networked computer nodes collaborating."),
("Parallelism","Two or more tasks literally executing simultaneously."),
("Concurrency","Multiple tasks making progress over overlapping time intervals.")],[138,349])
title("7. Programs, processes, and threads")
sub("Program versus process")
p("A <b>program</b> is stored instructions and data, such as an executable on disk. A <b>process</b> is an executing instance with state and managed resources: an address space, open files, security identity, and one or more threads. Two processes may run the same program without becoming the same process.")
sub("Thread: an execution path")
p("A <b>thread</b> is one flow of execution within a process. Threads typically share their process's memory and resources, while retaining their own instruction state and stack. Sharing makes cooperation easier but creates synchronization problems when two threads update the same state.")
sub("Why context switching happens")
p("The OS scheduler selects runnable threads or processes. A <b>context switch</b> saves execution information for one task and restores information for another. A task can stop because it waits for I/O, yields, is preempted by a timer, or because a higher-priority task needs to run.")
boxes([("RUNNING","Using a core"),("WAITING","Needs I/O"),("READY","Can run"),("RUNNING","Scheduled again")],"Figure 6. An example cycle through task states.")
p("On a single core, the browser and music player can appear to run together because switching is fast. That is <b>concurrency</b>. Two separate cores can actually execute instructions at once, giving <b>parallelism</b>.")
title("8. User mode, kernel mode, and protection")
p("General-purpose systems usually separate <b>user mode</b> from a more privileged <b>kernel mode</b>. Applications run with limited privileges. They cannot directly perform arbitrary sensitive operations such as configuring hardware controllers or mapping any physical memory they choose.")
layers([("USER MODE","Application instructions with limited privileges"),("SYSTEM CALL / EXCEPTION / INTERRUPT","Controlled entry to privileged handling"),("KERNEL MODE","Validate requests and perform protected operations")],"Figure 7. Protected transition between application and kernel work.")
sub("System calls")
p("An app might request open(), read(), write(), or other OS services. The request passes through an OS interface, CPU privilege changes under controlled rules, kernel code checks parameters/permissions and does the work, then returns a result. A system call is not the same thing as a normal user-space function call.")
sub("Why a timer matters")
p("If an application loops forever, the OS still needs a way to regain control. A hardware timer can periodically interrupt execution, allowing the OS to make scheduling decisions. This helps enable preemptive multitasking.")
sub("Protection and security")
p("<b>Protection</b> concerns rules on who may access which resources. <b>Security</b> includes protecting the system against unwanted use and attacks. The OS can enforce process isolation, access rights, authentication, and auditing, though the exact mechanisms depend on the system.")
note("Important distinction","An interrupt does not mean the CPU is physically switched off. It changes the flow of executed instructions so an event can be handled; afterwards the previous task may resume.")
title("9. How OS services are organized")
sub("System programs and services")
p("Operating systems provide file tools, loaders, shells, graphical environments, network services, and other utilities. Some run in user space; others may interact closely with the kernel. You should not treat every background service as a part of the privileged kernel.")
sub("Kernel design approaches")
grid(["Approach","Idea / tradeoff"],[
("Monolithic kernel","Many core OS facilities run in kernel address space. Calls between components can be direct, but bugs have broad impact."),
("Microkernel","Keeps a smaller privileged core; moves more services into user processes. Often needs more inter-process messaging."),
("Layered design","Organizes software into abstraction layers with defined responsibilities."),
("Modular / hybrid","Mixes principles; may load modules or use varying placements of services.")
],[134,353])
p("Real operating systems rarely fit a classroom category perfectly. The useful question is which component runs where, what privilege it has, and how it communicates.")
sub("OS responsibilities at a glance")
b("<b>Process management:</b> create, schedule, synchronize and terminate tasks.",
  "<b>Memory management:</b> allocate and isolate address spaces, track free/used memory, manage virtual memory.",
  "<b>File/storage management:</b> names, directories, metadata, allocation and persistence.",
  "<b>I/O management:</b> drivers, buffering, caching, device access and recovery.",
  "<b>Protection:</b> permissions, identities and resource boundaries.")
title("10. OS types and computing environments")
grid(["Type","Defining concern / example"],[
("Batch","Processes jobs with little interactive involvement."),
("Time-sharing / interactive","Keeps multiple users or applications responsive through scheduling."),
("Real-time","Correctness can depend on meeting deadlines, not just average speed."),
("Embedded","Runs inside purpose-built hardware; may have tight resource constraints."),
("Mobile","Combines general OS features with battery, sensors and app isolation."),
("Distributed / networked","Coordinates computation and resources across connected systems.")
],[156,331])
sub("Real-time does not mean 'very fast'")
p("A real-time system is designed around timing guarantees. A result delivered after its deadline can be a failure even if the computation was fast on average. The strength of guarantee depends on whether the system has hard or soft real-time requirements.")
sub("Virtual machines and hypervisors")
p("A <b>hypervisor</b> enables multiple virtual machines to share host hardware while presenting virtualized hardware to their guest OSs. A VM typically includes its own guest OS. A <b>container</b>, by contrast, commonly shares the host kernel while isolating applications using OS features.")
sub("Cloud service models")
grid(["Model","What you usually manage"],[
("IaaS","Guest OS, installed software and applications, while provider operates underlying infrastructure."),
("PaaS","Application and configuration; provider manages much of the runtime/platform."),
("SaaS","You use a completed software service; the provider operates the application.")
],[85,402])
note("Exam trap","Cloud is a way computing resources are delivered; virtualization is one technology that can help deliver them. They are related, but not synonyms.")
title("11. Worked example: saving a file")
p("This walkthrough joins the terms into one flow. Suppose you press Save in a text editor. The implementation varies by OS and file system, but the roles remain useful.")
boxes([("EDITOR","Requests save"),("KERNEL","Checks + plans"),("DRIVER","Tells controller"),("DEVICE","Writes data")],"Figure 8. Simplified software-to-hardware save path.")
b("<b>1. Application:</b> the editor has text in its process memory and requests a file write through an OS API or system call.",
  "<b>2. Transition:</b> execution enters a controlled kernel path. The OS checks the file descriptor, access rights, and request arguments.",
  "<b>3. Memory:</b> bytes may be copied or mapped to OS-managed buffers and cached file-system pages in RAM.",
  "<b>4. File system:</b> the OS maps the file and offset to storage metadata and decides what blocks must change.",
  "<b>5. I/O:</b> a storage driver sends requests to a device controller; data may travel by DMA between RAM and the device.",
  "<b>6. Scheduler:</b> while the write is pending, the task may sleep so another ready task can use the CPU.",
  "<b>7. Completion:</b> the device may signal an interrupt. The OS completes bookkeeping and wakes waiting work.",
  "<b>8. Return:</b> the application receives the result. A write call succeeding does not always guarantee durable power-loss-safe storage: synchronization or flushing may be needed.")
grid(["Term","Where it appeared"],[
("Kernel","Checked access, arranged OS work and handled completion."),
("Register","Held immediate CPU execution state and operands."),
("Bus / interconnect","Carried messages/data among CPU, RAM and controllers."),
("Buffer","Temporarily held bytes waiting to move or be consumed."),
("Interrupt","Reported hardware completion."),
("Scheduler","Chose work while the editor waited.")
],[133,354])
title("12. Common confusions and quick comparisons")
grid(["Confused terms","A reliable distinction"],[
("Kernel / CPU","Kernel = privileged software; CPU = hardware executing instructions."),
("Bus / buffer","Bus = communication pathway; buffer = temporary data storage."),
("Register / RAM","Register = tiny CPU-local working storage; RAM = main working memory."),
("Cache / buffer","Cache = copy for faster future reuse; buffer = holding data while moving/waiting."),
("Driver / controller","Driver = software; controller = device electronics."),
("Process / program","Process = running instance with state; program = stored code."),
("Interrupt / system call","Interrupt = external/timer event; system call = program requests privileged service."),
("Concurrent / parallel","Concurrent = overlapping progress; parallel = literally simultaneous execution."),
("Multicore / cluster","Multicore = cores in computer; cluster = multiple networked computers."),
("VM / container","VM commonly has a guest OS; container commonly shares host kernel.")
],[156,331])
sub("One-minute self-explanation")
p("A program runs as a process. The scheduler chooses a runnable thread. The CPU executes instructions using registers and accesses RAM through its memory system. If it needs a file or network data, the program asks the OS. The kernel checks access and coordinates a driver and device controller. Data may move via interconnects and buffers. A later interrupt can signal completion and allow the waiting process to continue.")
title("13. Test yourself: explain, do not just recall")
sub("Short-answer questions")
qs=[
"1. Explain the kernel versus the entire operating system, and give one kernel function.",
"2. If a CPU adds two numbers, where might the immediate intermediate value be stored?",
"3. Separate bus, controller, driver and buffer with one sentence for each.",
"4. Why do interrupts help CPU utilization when storage or network devices are slow?",
"5. Give one example each of register, buffer and cache use.",
"6. Can one core run several programs without literally executing two instructions simultaneously?",
"7. Distinguish program, process and thread.",
"8. Explain what happens when a user-space app calls a privileged OS service.",
"9. Why do user/kernel modes and hardware timers help protect multitasking?",
"10. What is a real-time deadline, and why isn't 'fast on average' enough?",
"11. Differentiate multicore, cluster and virtual machine.",
"12. During Save, which components handle scheduling, memory, file structure and device transfer?"
]
for x in qs:p(x)
sub("Multiple-choice questions")
b("13. Which generally remains stored without power? A Register  B CPU cache  C SSD  D RAM",
  "14. Device I/O completion may be reported with: A context switch  B hardware interrupt  C program counter  D RAM refresh",
  "15. Several tasks make progress through rapid switching on one core: A parallelism  B concurrency  C clustering  D DMA",
  "16. Which is software? A SSD controller  B RAM chip  C CPU core  D device driver",
  "17. In which cloud model does the customer commonly administer the guest OS? A SaaS  B PaaS  C IaaS  D none",
  "18. Which is correct? A cache always holds permanent data  B buffering guarantees faster internet  C system calls can enter kernel code  D real-time means maximum CPU speed")
title("14. Explained answer key")
answers=[
("1","The kernel is the privileged core; the OS is broader and includes services and utilities. Scheduling is a kernel responsibility."),
("2","Usually in a CPU register first. Cache and RAM updates follow the relevant instructions and memory rules."),
("3","Bus: pathway. Controller: device hardware interface. Driver: software that operates it. Buffer: temporary holding area."),
("4","The CPU can run another ready task while I/O is ongoing; a completion interrupt can signal when attention is needed."),
("5","Register: arithmetic operand. Buffer: queued stream bytes. Cache: recently used copied data."),
("6","Yes. Rapid scheduling produces concurrency on a single core without simultaneous independent instruction execution."),
("7","Program = stored instructions; process = active instance/resources; thread = execution path within a process."),
("8","A controlled system-call entry changes privilege, kernel validates and carries out work, then returns a result to user mode."),
("9","Privilege modes stop arbitrary app access. Timers let the OS regain control when a program would otherwise keep running."),
("10","A timing deadline is a required completion time. Late output may be useless regardless of good average speed."),
("11","Multicore = multiple cores, one computer. Cluster = several networked nodes. VM = virtualized machine with guest environment."),
("12","Scheduler manages runnable work; memory management manages buffers; file system organizes files; driver/controller perform I/O."),
("13","C, SSD: nonvolatile storage."),
("14","B, hardware interrupt: one common I/O completion signal."),
("15","B, concurrency: work overlaps over time; parallelism requires simultaneous work."),
("16","D, device driver: executable software."),
("17","C, IaaS: customers commonly manage the guest operating system."),
("18","C, a system call can invoke privileged OS services.")
]
for n,a in answers:
    p("<b>"+n+".</b> "+a)
sub("Your checkpoint")
note("Ready for the next lecture?","Explain the Save workflow in your own words and correctly distinguish kernel/CPU, driver/controller, register/buffer/cache, and concurrency/parallelism. If you can do that without checking these notes, you have a useful foundation for studying OS algorithms.")
p("These are teaching notes, not a substitute for the lecturer's exact terminology, diagrams, or any grading rubric. When the lecture uses a special definition, compare it with the general explanation here.")
doc.build(story,onFirstPage=page,onLaterPages=page)
print(str(OUT))
