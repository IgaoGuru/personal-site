---
title: "DLL injection, CSGO exploits and Buffer overrunning"
date: "2024-09-21"
description: ""
summary: "DLL Injection and Buffer Overflow Exploits are pretty cool"
tags: ["computer science", "cybersecurity", "CSGO"]
ShowToc: true
TocOpen: true
---

so the other day I was cooking up a programming assignment for the `C and assembly` course I'm taking at my local, non-descript university.

One of the assignments asked me to run gcc using the `-no-pie` flag. I had never seen that before and got curious about it. It turns out that it stands for `"no position independent executable`. 

Per [RedHat](https://www.redhat.com/en/blog/position-independent-executables-pie):
> Position Independent Executables (PIE) are an output of the hardened package build process. A PIE binary and all of its dependencies are loaded into random locations within virtual memory each time the application is executed. This makes Return Oriented Programming (ROP) attacks much more difficult to execute reliably

...

"Return Oriented Programming"... sounds interesting, doesn't it? It even has a dedicated acronym to itself. So I went to wikipedia, and after a bit of digging, I figured that until the 2000s, hackers were able to do `buffer overruns`. In those attacks, when a function didn't perform bounds checking before storing its user-provided parameters on the stack, the hacker would provide a larger-than-expected parameter, which would then overflow into the return address and local-variable sections of the function's stack frame. Then, the hacker could simply provide an arbitrary code snippet and engineer the input to point the stackFrame's return address to the provided arbitrary code! 

This kind of buffer overflow attack can still be done fairly easily on windows XP. [This](https://thegreycorner.com/2010/01/07/beginning-stack-based-buffer-overflow.html) tutorial by The Grey Corner does a great job of explaining the basics.

Linux systems started patching this in the mid 90's, while windows waited until **2004** to add protections. The solution was marking the memory where data (stackframe etc) is written as non-executable, a technique called `executable space protection` (ESP). 

Now, hackers found a way to circumvent this. Instead of having a payload full of malicious code, you could instead send a payload that would simply trigger a series of benign code snippets that were _already present in the stack (as part of the running program)_ and use that to overwrite the return address of a given function. Now, overwriting the return address of a function is no fun if you couldn't put your own code in it as well. If it's not in the payload, where could it be?? 

The answer: just use a DLL! Overwrite the return address to the address of your malicious function in a DLL you injected into the heap, and then you've got it!

I wonder if [Osiris](https://github.com/danielkrupinski/Osiris), the CSGO cheat that I reverse-engineered when making [my CSGO computerVision project](https://github.com/igaoguru/sequoia) doesn't do _exactly that_ somewhere... huh...