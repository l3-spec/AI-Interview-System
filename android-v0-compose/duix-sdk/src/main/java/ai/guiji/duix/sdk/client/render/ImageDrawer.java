package ai.guiji.duix.sdk.client.render;

import android.opengl.GLES20;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.FloatBuffer;

import ai.guiji.duix.sdk.client.bean.ImageFrame;
import ai.guiji.duix.sdk.client.util.OpenGLUtil;


public class ImageDrawer {

    protected int mImageTexId;

    protected int mMaskTexId;

    private final String vertexShaderCode =
            "uniform mat4 uMVPMatrix;\n" +
                    "attribute vec4 inputTextureCoordinate;\n" +
                    " varying vec2 textureCoordinate;\n" +
                    "attribute vec4 vPosition;\n" +
                    "void main() {\n" +
                    "  gl_Position = uMVPMatrix * vPosition;\n" +
                    "  textureCoordinate = inputTextureCoordinate.xy;\n" +
                    "}\n";

    private final String fragmentShaderCode =
            "precision mediump float;\n" +
                    "varying vec2 textureCoordinate;\n" +
                    "uniform sampler2D inputImageTexture;\n" +
                    "uniform sampler2D inputImageTexture2;\n" +
                    "void main() {\n" +
                    "  vec4 imageColor = texture2D(inputImageTexture, textureCoordinate);\n" +
                    "  vec4 maskColor = texture2D(inputImageTexture2, textureCoordinate);\n" +
                    "  float alpha = (maskColor.r + maskColor.g + maskColor.b) / 3.0;\n" +
                    "  gl_FragColor = vec4(imageColor.b, imageColor.g, imageColor.r, alpha);\n" +
                    "}\n";


    //顶点坐标
    static float vertexData[] = {   // in counterclockwise order:
            -1f, -1f, 0.0f, // bottom left
            1f, -1f, 0.0f, // bottom right
            -1f, 1f, 0.0f, // top left
            1f, 1f, 0.0f,  // top right
    };

    private FloatBuffer vertexBuffer; // buffer holding the vertices

    // 绘制索引
    //纹理坐标  对应顶点坐标  与之映射
    static float textureData[] = {   // in counterclockwise order:
            0f, 1f, 0.0f, // bottom left
            1f, 1f, 0.0f, // bottom right
            0f, 0f, 0.0f, // top left
            1f, 0f, 0.0f,  // top right
    };

    private FloatBuffer textureBuffer; // buffer holding the texture coordinates

    //每一次取点的时候取几个点
    static final int COORDS_PER_VERTEX = 3;

    private final int vertexCount = vertexData.length / COORDS_PER_VERTEX;

    //每一次取的总的点 大小
    private final int vertexStride = COORDS_PER_VERTEX * 4; // 4 bytes per vertex

    private int mProgram;

    private int uMVPMatrixLoc = -1;
    private int maPositionLoc = -1;
    private int maTextureCoordLoc = -1;

    private int inputImageTextureLoc = -1;

    private int inputImageTexture2Loc = -1;

    public ImageDrawer() {
        mImageTexId = OpenGLUtil.createTextureObject(GLES20.GL_TEXTURE_2D);
        mMaskTexId = OpenGLUtil.createTextureObject(GLES20.GL_TEXTURE_2D);

        ByteBuffer byteBuffer = ByteBuffer.allocateDirect(vertexData.length * 4);
        byteBuffer.order(ByteOrder.nativeOrder());
        vertexBuffer = byteBuffer.asFloatBuffer();
        vertexBuffer.put(vertexData);
        vertexBuffer.position(0);

        byteBuffer = ByteBuffer.allocateDirect(textureData.length * 4);
        byteBuffer.order(ByteOrder.nativeOrder());
        textureBuffer = byteBuffer.asFloatBuffer();
        textureBuffer.put(textureData);
        textureBuffer.position(0);

        mProgram = OpenGLUtil.createProgram(vertexShaderCode, fragmentShaderCode);

        if (mProgram > 0) {
            // 正交投影
            uMVPMatrixLoc = GLES20.glGetUniformLocation(mProgram, "uMVPMatrix");
            //获取顶点坐标字段
            maPositionLoc = GLES20.glGetAttribLocation(mProgram, "vPosition");
            //获取纹理坐标字段
            maTextureCoordLoc = GLES20.glGetAttribLocation(mProgram, "inputTextureCoordinate");

            inputImageTextureLoc = GLES20.glGetUniformLocation(mProgram, "inputImageTexture");
            inputImageTexture2Loc = GLES20.glGetUniformLocation(mProgram, "inputImageTexture2");
            
            OpenGLUtil.printVersionInfo();
        } else {
            android.util.Log.e("ImageDrawer", "Failed to create shader program");
        }

    }

    public void draw(ImageFrame imageFrame, float[] mvpMatrix) {
        if (mProgram <= 0) return;
        // 将程序添加到OpenGL ES环境
        GLES20.glUseProgram(mProgram);

        GLES20.glActiveTexture(GLES20.GL_TEXTURE0);
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, mImageTexId);
        GLES20.glPixelStorei(GLES20.GL_UNPACK_ALIGNMENT, 1); // 设置1字节对齐
//        GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, imageFrame.bitmap, 0);
        GLES20.glTexImage2D(GLES20.GL_TEXTURE_2D, 0, GLES20.GL_RGB, imageFrame.width, imageFrame.height, 0,
                GLES20.GL_RGB, GLES20.GL_UNSIGNED_BYTE, imageFrame.rawBuffer);
        GLES20.glUniform1i(inputImageTextureLoc, 0);

        GLES20.glActiveTexture(GLES20.GL_TEXTURE1);
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, mMaskTexId);
//        GLUtils.texImage2D(GLES20.GL_TEXTURE_2D, 0, maskBitmap, 0);
        GLES20.glTexImage2D(GLES20.GL_TEXTURE_2D, 0, GLES20.GL_RGB, imageFrame.width, imageFrame.height, 0,
                GLES20.GL_RGB, GLES20.GL_UNSIGNED_BYTE, imageFrame.maskBuffer);
        GLES20.glUniform1i(inputImageTexture2Loc, 1);

        GLES20.glUniformMatrix4fv(uMVPMatrixLoc, 1, false, mvpMatrix, 0);

        GLES20.glEnableVertexAttribArray(maPositionLoc);
        GLES20.glEnableVertexAttribArray(maTextureCoordLoc);
        //设置顶点位置值
        GLES20.glVertexAttribPointer(maPositionLoc, COORDS_PER_VERTEX, GLES20.GL_FLOAT, false, vertexStride, vertexBuffer);
        //设置纹理位置值
        GLES20.glVertexAttribPointer(maTextureCoordLoc, COORDS_PER_VERTEX, GLES20.GL_FLOAT, false, vertexStride, textureBuffer);
        //绘制 GLES20.GL_TRIANGLE_STRIP:复用坐标
        GLES20.glDrawArrays(GLES20.GL_TRIANGLE_STRIP, 0, vertexCount);

        // 禁用顶点数组
        GLES20.glDisableVertexAttribArray(maPositionLoc);
        GLES20.glDisableVertexAttribArray(maTextureCoordLoc);
        GLES20.glBindTexture(GLES20.GL_TEXTURE_2D, 0);
        GLES20.glUseProgram(0);
    }

    public void release() {
        if (mProgram > 0) {
            GLES20.glDeleteProgram(mProgram);
            mProgram = -1;
        }
        if (mImageTexId != 0) {
            GLES20.glDeleteTextures(1, new int[]{mImageTexId}, 0);
            mImageTexId = 0;
        }
        if (mMaskTexId != 0) {
            GLES20.glDeleteTextures(1, new int[]{mMaskTexId}, 0);
            mMaskTexId = 0;
        }

    }

}
