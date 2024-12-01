package main

import (
	"context"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"sort"
	"strings"

	"encoding/hex"

	"github.com/chromedp/cdproto/cdp"
	"github.com/chromedp/cdproto/runtime"
	"github.com/chromedp/chromedp"
)

const (
	downloadDir = "./data/"
)

func main() {
	opts := append(chromedp.DefaultExecAllocatorOptions[:],
		chromedp.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.106 Safari/537.36"),
		chromedp.UserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"),
	)
	ctx, cancel := chromedp.NewExecAllocator(context.Background(), opts...)
	defer cancel()
	ctx, cancel = chromedp.NewContext(ctx)
	defer cancel()

	var imgSrcs []string
	err := chromedp.Run(ctx,
		chromedp.EmulateViewport(1920, 2000),
		chromedp.Navigate(`https://poweron.loe.lviv.ua/`),
		// chromedp.CaptureScreenshot(&buf),
		chromedp.WaitReady("img[src*='media']",
			chromedp.AtLeast(1),
			chromedp.After(func(ctx context.Context, _ runtime.ExecutionContextID, nodes ...*cdp.Node) error {
				for _, node := range nodes {
					src, ok := node.Attribute("src")
					if ok {
						imgSrcs = append(imgSrcs, src)
					}
				}
				return nil
			}),
		),
	)
	if err != nil {
		panic(err)
	}

	saveImages(imgSrcs)
	saveDateToFile(imgSrcs)
}

func saveImages(imgSrcs []string) error {
	for _, src := range imgSrcs {
		resp, err := http.Get(src)
		if err != nil {
			return err
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return fmt.Errorf("failed to download file: HTTP status %s", resp.Status)
		}

		filename := src[strings.LastIndex(src, "/")+1:]
		extension := filename[strings.LastIndex(filename, ".")+1:]
		filepath := fileToUnixTimestamp(filename)
		outFile, err := os.Create(downloadDir + filepath + "." + extension)
		if err != nil {
			return fmt.Errorf("failed to create file: %v", err)
		}
		defer outFile.Close()

		// Copy the content from the response to the file
		_, err = io.Copy(outFile, resp.Body)
		if err != nil {
			return fmt.Errorf("failed to write content to file: %v", err)
		}
	}

	return nil
}

func saveDateToFile(imgSrcs []string) error {
	file, err := os.Create(downloadDir + "date.txt")
	if err != nil {
		return fmt.Errorf("failed to create file: %v", err)
	}
	defer file.Close()

	for i, src := range imgSrcs {
		filename := src[strings.LastIndex(src, "/")+1:]
		imgSrcs[i] = fileToUnixTimestamp(filename)
	}
	sort.Strings(imgSrcs)
	file.WriteString(imgSrcs[len(imgSrcs)-1])

	return nil
}

func fileToUnixTimestamp(filename string) string {
	hexTimestamp := filename[:8]

	// Decode the hexadecimal string into bytes
	bytes, err := hex.DecodeString(hexTimestamp)
	if err != nil {
		log.Fatal(err)
	}

	// Convert the byte slice into an integer (big-endian order)
	timestamp := int64(bytes[0])<<24 | int64(bytes[1])<<16 | int64(bytes[2])<<8 | int64(bytes[3])

	return fmt.Sprintf("%d", timestamp)
}
